import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { COACH_SYSTEM } from "@/lib/coach-prompt";
import { COACH_TOOLS } from "@/lib/coach-tools";
import { runOpenRouterChat } from "@/lib/openrouter";
import { anthropic, apiErrorMessage, guard, MODEL, viaOpenRouter } from "@/lib/server";

export const maxDuration = 300;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .min(1),
  context: z.string().max(20000),
  /** Optional photo (data URL) attached to the newest user message. */
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(6_000_000)
    .optional(),
});

class Truncated extends Error {}

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "请求格式不对" }, { status: 400 });
  const { messages, context, image } = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      if (viaOpenRouter()) {
        try {
          await runOpenRouterChat({ system: COACH_SYSTEM, context, messages, image, send });
          send({ type: "done" });
        } catch (err) {
          console.error("chat error", err);
          send({ type: "error", error: apiErrorMessage(err) });
        } finally {
          controller.close();
        }
        return;
      }

      const tools = COACH_TOOLS.map((t) =>
        betaZodTool({
          name: t.name,
          description: t.description,
          inputSchema: t.schema,
          eager_input_streaming: true,
          run: async (input) => {
            send(t.event(input));
            return t.result;
          },
        }),
      );

      const params = {
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default" as const,
        output_config: { effort: "medium" as const },
        system: [
          {
            type: "text" as const,
            text: COACH_SYSTEM,
            cache_control: { type: "ephemeral" as const },
          },
          { type: "text" as const, text: context },
        ],
        tools,
        messages: messages.map((m, i) => {
          if (!image || i !== messages.length - 1 || m.role !== "user")
            return { role: m.role, content: m.text };
          const [head, data] = image.split(",");
          return {
            role: m.role,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: head.slice(5, head.indexOf(";")) as
                    | "image/jpeg"
                    | "image/png"
                    | "image/webp",
                  data,
                },
              },
              { type: "text" as const, text: m.text },
            ],
          };
        }),
        max_iterations: 6,
        stream: true as const,
      };

      try {
        let runner = anthropic().beta.messages.toolRunner(params);
        for (let attempt = 0; ; attempt++) {
          try {
            for await (const messageStream of runner) {
              for await (const event of messageStream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  send({ type: "text", text: event.delta.text });
                } else if (
                  event.type === "content_block_start" &&
                  event.content_block.type === "tool_use"
                ) {
                  send({ type: "tool", name: event.content_block.name });
                }
              }
              const message = await messageStream.finalMessage();
              attempt = 0;
              const hasToolUse = message.content.some(
                (b) => b.type === "tool_use",
              );
              if (message.stop_reason === "max_tokens" && hasToolUse)
                throw new Truncated();
              if (message.stop_reason === "refusal") {
                send({
                  type: "text",
                  text: "\n\n(这个问题我没办法回答,换个说法试试?)",
                });
                break;
              }
              send({ type: "text", text: "\n\n" });
            }
            break;
          } catch (err) {
            if (
              err instanceof Anthropic.APIError ||
              err instanceof Truncated ||
              attempt >= 2
            )
              throw err;
            // tool input was not parseable JSON: re-issue the turn
            runner = anthropic().beta.messages.toolRunner({ ...runner.params });
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("chat error", err);
        send({ type: "error", error: apiErrorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
