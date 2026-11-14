import Anthropic from "@anthropic-ai/sdk";
import { isAllowedModel } from "./models";
import { OpenRouterError } from "./openrouter";

export const MODEL = "claude-opus-5-5";

/** OpenRouter is used when its key is set; otherwise the Anthropic API directly. */
export const viaOpenRouter = () => !!process.env.OPENROUTER_API_KEY;

/** Client-requested model; returns undefined if absent or not allowlisted. */
export function requestedModel(req: Request): string | undefined {
  const id = req.headers.get("x-ai-model")?.trim() ?? "";
  return isAllowedModel(id) ? id : undefined;
}

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

/** Returns an error Response if the request may not use the AI, else null. */
export function guard(req: Request): Response | null {
  if (
    !process.env.OPENROUTER_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.ANTHROPIC_AUTH_TOKEN
  ) {
    return Response.json(
      {
        error:
          "服务器还没有配置 API key(OPENROUTER_API_KEY 或 ANTHROPIC_API_KEY),AI 教练暂时不能用。",
      },
      { status: 503 },
    );
  }
  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers.get("x-app-passcode") !== pass) {
    return Response.json(
      { error: "口令不对。请到「我的」页面填写正确的访问口令。" },
      { status: 401 },
    );
  }
  return null;
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof OpenRouterError) {
    if (err.status === 401) return "OpenRouter 的 API Key 无效,请检查 OPENROUTER_API_KEY。";
    if (err.status === 402) return "OpenRouter 账户余额不足,请先充值。";
    if (err.status === 429) return "请求太频繁了,等一会儿再试。";
    if (err.status === 404 || err.status === 400)
      return `OpenRouter 不接受这个请求(${err.status}),请检查 OPENROUTER_MODEL 是否填对。`;
    return `AI 服务出错了(${err.status}),请稍后再试。`;
  }
  if (err instanceof Anthropic.AuthenticationError)
    return "API Key 无效,请检查服务器的 ANTHROPIC_API_KEY。";
  if (err instanceof Anthropic.RateLimitError)
    return "请求太频繁了,等一会儿再试。";
  if (err instanceof Anthropic.APIConnectionError)
    return "连不上 AI 服务,请检查网络后重试。";
  if (err instanceof Anthropic.APIError)
    return `AI 服务出错了(${err.status ?? "?"}),请稍后再试。`;
  return "出了点问题,请再试一次。";
}
