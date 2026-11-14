import { z } from "zod";
import { runStructuredAI } from "@/lib/ai-structured";
import { WATCH_PROMPT, WatchSchema } from "@/lib/coach-tools";
import { apiErrorMessage, guard, requestedModel, resolveOpenRouterKey } from "@/lib/server";

export const maxDuration = 120;

const Body = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
});

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "请上传 JPG/PNG 截图" }, { status: 400 });

  const model = requestedModel(req);
  const apiKey = resolveOpenRouterKey(req);
  try {
    const out = await runStructuredAI({
      schema: WatchSchema,
      schemaName: "watch_summary",
      prompt: WATCH_PROMPT,
      image: parsed.data.image,
      maxTokens: 1000,
      effort: "low",
      model,
      apiKey,
    });
    if (!out)
      return Response.json({ error: "没能读懂这张截图,请手动填写。" }, { status: 422 });
    return Response.json(out);
  } catch (err) {
    console.error("watch error", err);
    return Response.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
