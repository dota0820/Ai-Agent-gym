import { z } from "zod";
import { runStructuredAI } from "@/lib/ai-structured";
import { NutritionSchema } from "@/lib/coach-tools";
import { apiErrorMessage, guard, requestedModel, resolveOpenRouterKey } from "@/lib/server";

export const maxDuration = 120;

const Body = z.object({
  text: z.string().max(1500).optional(),
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(6_000_000)
    .optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  context: z.string().max(6000).optional(),
});

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.text?.trim() && !parsed.data.image)) {
    return Response.json({ error: "请拍照或输入你吃了什么。" }, { status: 400 });
  }

  const { text, image, mealType, context } = parsed.data;
  const mealHint = mealType ? `用户选择的餐次: ${mealType}` : "请根据食物内容判断餐次";
  const prompt = [
    "你是一位住在健身 App 里的私人运动营养师，服务对象是正在健身的新手（减脂/增肌/塑形）。",
    "请根据用户发来的食物照片和/或文字描述，识别出所有食物并合理估算热量(kcal)、蛋白质(g)、碳水化合物(g)、脂肪(g)。",
    "要求：",
    "1. 尽量按常见亚洲/中式与健身餐份量做务实估算（例如外卖盖饭要考虑用油，奶茶要考虑糖奶，鸡胸肉/鸡蛋/米饭按常规份量），各单品之和应与 total 一致。",
    "2. 如果照片或文字完全不是食物/饮品（比如风景、健身器材），将 is_food 设为 false，其它字段可填 0 或空。",
    "3. 在 advice 里结合用户目标、今日已摄入营养和训练情况，用温暖鼓励的语气给出 1–2 句具体建议（例如还差多少蛋白质、下一餐怎么搭配、饮品热量提醒），并顺带说明这是估算值。",
    mealHint,
    text?.trim() ? `用户文字描述: ${text.trim()}` : "",
    context ? `\n用户背景与今日记录:\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const model = requestedModel(req);
  const apiKey = resolveOpenRouterKey(req);
  try {
    const out = await runStructuredAI({
      schema: NutritionSchema,
      schemaName: "nutrition_analysis",
      prompt,
      image,
      maxTokens: 2000,
      effort: "low",
      model,
      apiKey,
    });
    if (!out) {
      return Response.json({ error: "没能分析出这餐的营养成分，请换张图或补几个字再试。" }, { status: 422 });
    }
    return Response.json(out);
  } catch (err) {
    console.error("nutrition error", err);
    return Response.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
