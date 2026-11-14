import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

/** Returns an error Response if the request may not use the AI, else null. */
export function guard(req: Request): Response | null {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "服务器还没有配置 ANTHROPIC_API_KEY,AI 教练暂时不能用。" },
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
