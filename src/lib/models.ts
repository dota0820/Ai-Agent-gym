export interface AiModel {
  id: string;
  label: string;
  note: string;
  /** USD per million tokens (input / output) when this list was written; OpenRouter is authoritative. */
  price: [number, number];
  group: "recommended" | "cheap" | "strong" | "other";
}

export const MODEL_GROUPS: { id: AiModel["group"]; label: string; hint: string }[] = [
  { id: "recommended", label: "推荐", hint: "日常用这几个就够" },
  { id: "cheap", label: "最省钱", hint: "几乎不花钱,讲解会粗一些" },
  { id: "strong", label: "最聪明", hint: "讲解最细、看照片最准,价格也最高" },
  { id: "other", label: "其他", hint: "" },
];

/** Hand-picked models. All of them support tool calling and image input, which the coach needs. */
export const AI_MODELS: AiModel[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "快、便宜,日常够用", price: [0.3, 2.5], group: "recommended" },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5", note: "讲解细,中文语气自然", price: [2, 10], group: "recommended" },
  { id: "openai/gpt-6.1-terra", label: "GPT-6.1 Terra", note: "OpenAI 的中档模型", price: [1, 5], group: "recommended" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Google 较新的快速模型", price: [0.83, 4.12], group: "recommended" },

  { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5", note: "Claude 里最便宜的", price: [0.1, 0.5], group: "cheap" },
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna", note: "OpenAI 里最便宜的", price: [0.1, 0.5], group: "cheap" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", note: "Google 里最便宜的", price: [0.1, 0.4], group: "cheap" },
  { id: "deepseek/deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash", note: "国产,非常便宜", price: [0.05, 0.2], group: "cheap" },
  { id: "qwen/qwen3.8-flash", label: "通义千问 3.8 Flash", note: "国产,非常便宜", price: [0.15, 0.47], group: "cheap" },
  { id: "z-ai/glm-5.3-flash", label: "智谱 GLM-5.3 Flash", note: "国产,列表里最便宜", price: [0.04, 0.08], group: "cheap" },

  { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5", note: "Claude 的高档模型", price: [4, 20], group: "strong" },
  { id: "anthropic/claude-fable-5.2", label: "Claude Fable 5.2", note: "Claude 最强,也最贵", price: [8, 40], group: "strong" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "更聪明,看照片更准,稍慢", price: [1.25, 10], group: "strong" },
  { id: "google/gemini-4-carbon", label: "Gemini 4 Carbon", note: "Google 的高档模型", price: [2, 10], group: "strong" },
  { id: "openai/gpt-6.1-sol", label: "GPT-6.1 Sol", note: "OpenAI 的高档模型", price: [2, 10], group: "strong" },
  { id: "moonshotai/kimi-k3.1-pro", label: "Kimi K3.1 Pro", note: "国产高档模型", price: [2, 10], group: "strong" },
  { id: "qwen/qwen3.8-max-0902", label: "通义千问 3.8 Max", note: "国产高档模型", price: [2, 6], group: "strong" },

  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5", note: "上一代 Sonnet", price: [2, 10], group: "other" },
  { id: "openai/gpt-4o", label: "GPT-4o", note: "较旧的 ChatGPT 模型", price: [2.5, 10], group: "other" },
];

/**
 * "" = use server default (OPENROUTER_MODEL). Any well-formed OpenRouter id is
 * accepted so models picked from the live list work too; OpenRouter itself
 * rejects ids that do not exist.
 */
export function isAllowedModel(id: string): boolean {
  return id.length <= 80 && /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i.test(id);
}

export interface LiveModel {
  id: string;
  name: string;
  price: [number, number];
}

/** Every model on OpenRouter that can do what the coach needs (tools + images), newest first. */
export async function fetchLiveModels(): Promise<LiveModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(String(res.status));
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data: any[] = (await res.json()).data ?? [];
  return data
    .filter(
      (m) =>
        m.supported_parameters?.includes("tools") &&
        m.architecture?.input_modalities?.includes("image") &&
        m.architecture?.output_modalities?.includes("text") &&
        !/:batch$/.test(m.id) &&
        isAllowedModel(m.id),
    )
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      price: [Number(m.pricing?.prompt ?? 0) * 1e6, Number(m.pricing?.completion ?? 0) * 1e6] as [
        number,
        number,
      ],
    }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const fmtPrice = ([i, o]: [number, number]) =>
  i === 0 && o === 0 ? "免费" : `$${+i.toFixed(2)} / $${+o.toFixed(2)}`;
