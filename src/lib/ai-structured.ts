import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { structuredOpenRouter } from "./openrouter";
import { anthropic, MODEL, viaOpenRouter } from "./server";

export async function runStructuredAI<T>(opts: {
  schema: z.ZodType<T>;
  schemaName: string;
  prompt: string;
  image?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  model?: string;
}): Promise<T | null> {
  if (viaOpenRouter()) {
    return structuredOpenRouter({
      schema: opts.schema,
      schemaName: opts.schemaName,
      prompt: opts.prompt,
      image: opts.image,
      maxTokens: opts.maxTokens,
      model: opts.model,
    });
  }

  const content: Array<
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: "image/jpeg" | "image/png" | "image/webp";
          data: string;
        };
      }
    | { type: "text"; text: string }
  > = [];

  if (opts.image) {
    const [head, data] = opts.image.split(",");
    const media_type = head.slice(5, head.indexOf(";")) as
      | "image/jpeg"
      | "image/png"
      | "image/webp";
    content.push({ type: "image", source: { type: "base64", media_type, data } });
  }
  content.push({ type: "text", text: opts.prompt });

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    output_config: {
      effort: opts.effort ?? "low",
      format: zodOutputFormat(opts.schema),
    },
    messages: [{ role: "user", content }],
  });

  return res.parsed_output ?? null;
}
