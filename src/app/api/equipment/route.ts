import { z } from "zod";
import { runStructuredAI } from "@/lib/ai-structured";
import { EquipmentScanSchema } from "@/lib/coach-tools";
import { ALL_EQUIPMENT_ITEMS } from "@/lib/equipment";
import { apiErrorMessage, guard } from "@/lib/server";

export const maxDuration = 120;

const Body = z.object({
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(6_000_000),
});

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "请上传 JPG/PNG 照片。" }, { status: 400 });
  }

  const prompt = [
    "请识别这张健身房照片中出现的所有健身器械与器材。",
    `请优先匹配到以下标准名称列表（必须一字不差）：${ALL_EQUIPMENT_ITEMS.join("、")}。`,
    "如果看到了标准列表里没有的其他具体器械（例如“倒立机”“战绳”“雪橇车”），放进 extra_equipment。",
    "如果照片里根本不是健身器械，把 is_gym_photo 设为 false。",
  ].join("\n");

  try {
    const out = await runStructuredAI({
      schema: EquipmentScanSchema,
      schemaName: "equipment_scan",
      prompt,
      image: parsed.data.image,
      maxTokens: 1200,
      effort: "low",
    });
    if (!out) {
      return Response.json({ error: "没看清照片里的器械，可以换个角度拍一张。" }, { status: 422 });
    }
    const validSet = new Set(ALL_EQUIPMENT_ITEMS);
    const matched = out.matched_equipment.filter((x) => validSet.has(x));
    const extra = out.extra_equipment.map((x) => x.trim()).filter(Boolean);
    return Response.json({
      is_gym_photo: out.is_gym_photo,
      matched,
      extra,
      summary: out.summary,
    });
  } catch (err) {
    console.error("equipment error", err);
    return Response.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
