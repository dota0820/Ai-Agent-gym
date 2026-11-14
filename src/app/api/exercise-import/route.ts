import { z } from "zod";
import { runStructuredAI } from "@/lib/ai-structured";
import { ImportedExerciseSchema } from "@/lib/coach-tools";
import { extractLinkInfo } from "@/lib/link-extract";
import { apiErrorMessage, guard, requestedModel } from "@/lib/server";
import { MUSCLE_LABEL, SUBS, type Group, type Muscle } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({
  input: z.string().max(3000).optional(),
  note: z.string().max(1500).optional(),
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(6_000_000)
    .optional(),
});

const DEFAULT_PRIMARY: Record<Group, Muscle[]> = {
  back: ["upper-back"],
  chest: ["chest"],
  legs: ["quadriceps"],
  glutes: ["gluteal"],
  shoulders: ["front-deltoids"],
  arms: ["biceps"],
  core: ["abs"],
  cardio: ["quadriceps"],
};

const VALID_MUSCLES = new Set(Object.keys(MUSCLE_LABEL));
const isMuscle = (m: string): m is Muscle => VALID_MUSCLES.has(m);

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.input?.trim() && !parsed.data.note?.trim() && !parsed.data.image)) {
    return Response.json({ error: "请粘贴视频链接、分享文案，或上传一张动作截图。" }, { status: 400 });
  }

  const rawInput = parsed.data.input?.trim() ?? "";
  const note = parsed.data.note?.trim() ?? "";
  const image = parsed.data.image;

  const linkInfo = await extractLinkInfo(rawInput);
  const subGuide = Object.entries(SUBS)
    .map(([g, list]) => `${g}: ${list.map((s) => `${s.id}(${s.label})`).join(", ") || "(空)"}`)
    .join(" | ");
  const muscleGuide = Object.entries(MUSCLE_LABEL)
    .map(([id, label]) => `${id}(${label})`)
    .join(", ");

  const prompt = [
    "你要帮健身新手把来自 YouTube / 小红书 / Facebook / 网页的健身视频或教程整理成 App 动作库卡片。",
    "请仔细查看下面能获取到的全部线索（粘贴文案、网页抓取信息、用户补充说明、以及附带的图片）。",
    "",
    "重要诚实原则：",
    "- 如果平台返回了登录墙/反爬拦截（blocked=true），且粘贴文本里只有光秃秃的 URL/短链而没有任何动作名称/关键词，同时也没有用户补充说明和截图，请务必将 readable 设为 false，不要凭空编造！在 reason_if_unreadable 里友好告诉用户：比如“这个链接（如 Facebook / 小红书）需要登录才能读取，把视频标题一起复制过来，或者在下面补充动作名/截一张图，我就能立刻整理好”。",
    "- 如果只要能判断出具体是什么训练动作（哪怕只从分享文案标题、YouTube标题、用户补充或截图看出来），就将 readable 设为 true，并用通俗易懂的简体中文写出完整、对新手友好的教程（准备姿势用身体可触摸的部位作参照，3 个大字核心要点 cues，3-5 个动作步骤 steps，常见错误 mistakes，哪里该有感觉 feel）。",
    "",
    `可用部位 group 与子分类 sub 对应关系：${subGuide}`,
    `可用肌肉 id 列表（primary / secondary 只能从这里选）：${muscleGuide}`,
    "",
    rawInput ? `用户粘贴内容:\n${rawInput}` : "",
    note ? `用户补充说明:\n${note}` : "",
    linkInfo.sourceUrl
      ? [
          `解析到的链接平台: ${linkInfo.platform}`,
          `是否被登录/反爬拦截(blocked): ${linkInfo.blocked}`,
          linkInfo.author ? `作者/频道: ${linkInfo.author}` : "",
          linkInfo.title ? `网页/视频标题: ${linkInfo.title}` : "",
          linkInfo.description ? `网页/视频简介: ${linkInfo.description}` : "",
          linkInfo.bodyText ? `页面正文片段: ${linkInfo.bodyText}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const model = requestedModel(req);
  try {
    const out = await runStructuredAI({
      schema: ImportedExerciseSchema,
      schemaName: "imported_exercise",
      prompt,
      image,
      maxTokens: 2500,
      effort: "medium",
      model,
    });

    if (!out) {
      return Response.json(
        { error: "没能解析这个链接内容，请补充一下动作名称或附上一张视频截图再试试。" },
        { status: 422 },
      );
    }

    if (!out.readable) {
      return Response.json(
        {
          needsMoreInfo: true,
          error:
            out.reason_if_unreadable ||
            "这个链接需要登录才能读取内容，请顺便贴一下视频标题或附一张截图。",
          sourceUrl: linkInfo.sourceUrl,
          sourcePlatform: linkInfo.platform,
          imageUrl: linkInfo.imageUrl,
        },
        { status: 422 },
      );
    }

    const group = out.group;
    const validSubs = SUBS[group];
    const sub = validSubs.some((s) => s.id === out.sub) ? out.sub : (validSubs[0]?.id ?? "");
    const primaryRaw = out.primary.filter(isMuscle);
    const primary = primaryRaw.length > 0 ? primaryRaw : DEFAULT_PRIMARY[group];
    const secondary = out.secondary.filter((m): m is Muscle => isMuscle(m) && !primary.includes(m));

    return Response.json({
      exercise: {
        name: out.name.trim(),
        nameEn: out.nameEn.trim(),
        group,
        sub,
        primary,
        secondary,
        startWeight: out.startWeight.trim() || "从轻重量或自重开始",
        equipment: out.equipment.trim() || "请参考原视频",
        setup: out.setup.trim(),
        cues: out.cues.map((x) => x.trim()).filter(Boolean).slice(0, 3),
        steps: out.steps.map((x) => x.trim()).filter(Boolean),
        mistakes: out.mistakes.map((x) => x.trim()).filter(Boolean),
        feel: out.feel.trim(),
      },
      sourceUrl: linkInfo.sourceUrl,
      sourcePlatform: linkInfo.platform,
      imageUrl: linkInfo.imageUrl,
    });
  } catch (err) {
    console.error("exercise-import error", err);
    return Response.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
