import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { COACH_SYSTEM } from "@/lib/coach-prompt";
import { anthropic, apiErrorMessage, guard, MODEL } from "@/lib/server";

export const maxDuration = 300;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .min(1),
  context: z.string().max(20000),
});

const guideSchema = z.object({
  equipment: z.string(),
  setup: z.string().describe("器械怎么调、坐/站在哪里、手握哪里"),
  steps: z.array(z.string()).describe("一步一步的动作要领,含呼吸和速度"),
  common_mistakes: z.array(z.string()),
  feel: z.string().describe("应该哪里有感觉"),
});

const planSchema = z.object({
  title: z.string().describe("例如“背部训练 A”"),
  focus: z.string().describe("主要部位,例如“背”"),
  note: z.string().optional().describe("给用户的一句整体提醒"),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().describe("动作库 id,或 custom"),
        name: z.string().describe("中文名"),
        name_en: z.string().optional(),
        sets: z.number().int().min(1).max(8),
        reps: z.string().describe("例如 10-12,或 30秒"),
        rest_seconds: z.number().int().min(0).max(300),
        suggested_weight: z.string().optional().describe("例如 20 kg、每只 5 kg"),
        coach_note: z.string().optional().describe("这次最该注意的一个要点"),
        custom_instructions: guideSchema.optional(),
      }),
    )
    .min(1)
    .max(10),
});

const logSchema = z.object({
  title: z.string(),
  focus: z.string(),
  date: z.string().describe("YYYY-MM-DD"),
  notes: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().describe("动作库 id,或 custom"),
        name: z.string(),
        sets: z.array(
          z.object({
            weight_kg: z.number().nullable().describe("自重填 null"),
            reps: z.number().int(),
          }),
        ),
      }),
    )
    .min(1),
});

class Truncated extends Error {}

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "请求格式不对" }, { status: 400 });
  const { messages, context } = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      const tools = [
        betaZodTool({
          name: "save_workout_plan",
          description:
            "把一次训练计划保存到 App 的「今天」页面,用户可以直接点开始训练。安排好训练时调用;它会替换当前的计划。",
          inputSchema: planSchema,
          eager_input_streaming: true,
          run: async (input) => {
            send({ type: "plan", plan: input });
            return "计划已保存,用户现在能在聊天里看到计划卡片,也能在「今天」页面点“开始训练”。";
          },
        }),
        betaZodTool({
          name: "log_workout",
          description:
            "把用户口述的、已经完成的训练记入训练记录。只记录用户明确说做过的内容。",
          inputSchema: logSchema,
          eager_input_streaming: true,
          run: async (input) => {
            send({ type: "workout", workout: input });
            return "已记入训练记录。";
          },
        }),
        betaZodTool({
          name: "remember",
          description:
            "记住一条关于用户的长期信息(伤病、偏好、器械限制、目标等),以后每次对话都会看到。",
          inputSchema: z.object({ note: z.string() }),
          eager_input_streaming: true,
          run: async ({ note }) => {
            send({ type: "memory", note });
            return "已记住。";
          },
        }),
      ];

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
        messages: messages.map((m) => ({ role: m.role, content: m.text })),
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
