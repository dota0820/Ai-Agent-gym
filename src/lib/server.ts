import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS, isAllowedModel } from "./models";
import { OPENROUTER_MODEL, OPENROUTER_VISION_MODEL, OpenRouterError } from "./openrouter";

export const MODEL = "claude-opus-5-5";

const CURATED_MODEL_IDS = new Set([
  ...AI_MODELS.map((m) => m.id),
  OPENROUTER_MODEL,
  OPENROUTER_VISION_MODEL,
]);

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_MIN = 30;
const rateBuckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(req: Request): boolean {
  const key = clientIp(req);
  const now = Date.now();
  const prev = rateBuckets.get(key)?.filter((t) => now - t < RATE_WINDOW_MS) ?? [];
  if (prev.length >= RATE_LIMIT_PER_MIN) {
    rateBuckets.set(key, prev);
    return true;
  }
  prev.push(now);
  rateBuckets.set(key, prev);
  if (rateBuckets.size > 1000) {
    for (const [k, v] of rateBuckets) {
      if (!v.length || now - v[v.length - 1] >= RATE_WINDOW_MS) rateBuckets.delete(k);
    }
  }
  return false;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Compare equal-length dummy to avoid leaking length timing trivially
    crypto.timingSafeEqual(ba, Buffer.alloc(ba.length));
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/** The passcode header, URL-decoded (the app encodes it so non-Latin characters survive). */
function passcodeOf(req?: Request): string {
  const raw = req?.headers.get("x-app-passcode")?.trim() ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Returns client-provided OpenRouter key if present (separate from server env key). */
function clientOpenRouterKey(req?: Request): string | undefined {
  const headerKey = req?.headers.get("x-openrouter-key")?.trim();
  if (headerKey) return headerKey;
  const passKey = passcodeOf(req);
  if (passKey && passKey.startsWith("sk-or-")) return passKey;
  return undefined;
}

/** Resolve OpenRouter API key from request header (or sk-or- in passcode) or server env. */
export function resolveOpenRouterKey(req?: Request): string | undefined {
  const clientKey = clientOpenRouterKey(req);
  if (clientKey) return clientKey;
  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  return envKey || undefined;
}

/** OpenRouter is used when its key is set (in env or request); otherwise the Anthropic API directly. */
export const viaOpenRouter = (req?: Request) => !!resolveOpenRouterKey(req);

/**
 * Client-requested model.
 * When using the server's own API key, restrict to curated allowlisted models to prevent
 * arbitrary expensive model billing abuse; when the user supplies their own key, allow any valid id.
 */
export function requestedModel(req: Request): string | undefined {
  const id = req.headers.get("x-ai-model")?.trim() ?? "";
  if (!id || !isAllowedModel(id)) return undefined;
  if (clientOpenRouterKey(req)) return id;
  return CURATED_MODEL_IDS.has(id) ? id : undefined;
}

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

/** Returns an error Response if the request may not use the AI, else null. */
export function guard(req: Request): Response | null {
  if (isRateLimited(req)) {
    return Response.json(
      { error: "请求太频繁了，请稍等 1 分钟再试。" },
      { status: 429 },
    );
  }
  if (
    !resolveOpenRouterKey(req) &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.ANTHROPIC_AUTH_TOKEN
  ) {
    return Response.json(
      {
        error:
          "还没有配置 API Key。请到「我的 → AI 模型」粘贴你的 OpenRouter Key，或在 Vercel 环境变量配置后重新部署。",
      },
      { status: 503 },
    );
  }
  const pass = process.env.APP_PASSCODE?.trim();
  if (pass && !timingSafeEqualStr(passcodeOf(req), pass)) {
    return Response.json(
      { error: "口令不对。请到「我的」页面填写正确的访问口令。" },
      { status: 401 },
    );
  }
  return null;
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof OpenRouterError) {
    if (err.status === 401) return "OpenRouter 的 API Key 无效。请到「我的 → AI 模型」重新粘贴一次 Key(以 sk-or- 开头)。";
    if (err.status === 402) return "OpenRouter 账户余额不足,请先充值。";
    if (err.status === 429) return "请求太频繁了,等一会儿再试。";
    if (err.status === 404 || err.status === 400)
      return `OpenRouter 不接受这个请求(${err.status})。请到「我的 → AI 模型」换一个模型再试。`;
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
