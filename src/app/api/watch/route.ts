import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { WATCH_PROMPT, WatchSchema } from "@/lib/coach-tools";
import { readWatchWithOpenRouter } from "@/lib/openrouter";
import { anthropic, apiErrorMessage, guard, MODEL, viaOpenRouter } from "@/lib/server";

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

  const [head, data] = parsed.data.image.split(",");
  const media_type = head.slice(5, head.indexOf(";")) as
    | "image/jpeg"
    | "image/png"
    | "image/webp";

  try {
    if (viaOpenRouter()) {
      const out = await readWatchWithOpenRouter(parsed.data.image);
      if (!out)
        return Response.json({ error: "没能读懂这张截图,请手动填写。" }, { status: 422 });
      return Response.json(out);
    }
    const res = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(WatchSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data } },
            {
              type: "text",
              text: WATCH_PROMPT,
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
