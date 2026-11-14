export interface AiModel {
  id: string;
  label: string;
  note: string;
}

export const AI_MODELS: AiModel[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "快、便宜，日常够用（推荐）" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "更聪明，看照片更准，稍慢" },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet", note: "中文语气最自然的教练" },
  { id: "openai/gpt-4o", label: "GPT-4o", note: "ChatGPT 同款" },
];

/** "" = use server default (OPENROUTER_MODEL). */
export function isAllowedModel(id: string): boolean {
  return AI_MODELS.some((m) => m.id === id);
}
