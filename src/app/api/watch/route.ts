import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { anthropic, apiErrorMessage, guard, MODEL } from "@/lib/server";

export const maxDuration = 120;

const Body = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
});

const Watch = z.object({
  is_workout_summary: z
    .boolean()
    .describe("图片是否是手表/运动健康 App 的一次运动记录"),
  duration_min: z.number().nullable().describe("运动时长,分钟"),
  calories: z.number().nullable().describe("消耗千卡(优先取运动/活动消耗)"),
  avg_hr: z.number().nullable().describe("平均心率 bpm"),
  max_hr: z.number().nullable().describe("最高心率 bpm"),
});

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "请上传 JPG/PNG 截图" }, { status: 400 });

  const [head, data] = parsed.data.image.split(",");
  const media_type = head.slice(5, head.indexOf(";")) as
    | "image/jpeg"
    | "image/png"
    | "image/webp";

  try {
    const res = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Watch) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data } },
            {
              type: "text",
              text: "这是一张智能手表或运动健康 App(例如荣耀运动健康、华为运动健康、Apple 健身、Garmin)的运动记录截图。请读出其中的运动时长、消耗卡路里、平均心率和最高心率。截图里没有的数值填 null,不要猜。",
            },
          ],
        },
      ],
    });
    if (!res.parsed_output)
      return Response.json({ error: "没能读懂这张截图,请手动填写。" }, { status: 422 });
    return Response.json(res.parsed_output);
  } catch (err) {
    console.error("watch error", err);
    return Response.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
