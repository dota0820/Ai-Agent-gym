import dns from "node:dns/promises";
import net from "node:net";

export interface ExtractedLinkInfo {
  sourceUrl?: string;
  platform: string;
  fetched: boolean;
  blocked: boolean;
  title?: string;
  description?: string;
  bodyText?: string;
  author?: string;
  imageUrl?: string;
}

const URL_RE = /https?:\/\/[^\s\u4e00-\u9fa5<>"'`)\]]+/i;
const MAX_HTML_BYTES = 450_000;
const MAX_REDIRECTS = 5;

export function extractFirstUrl(text: string): string | undefined {
  const m = URL_RE.exec(text);
  if (!m) return undefined;
  return m[0].replace(/[.,;!?，。；！？、]+$/, "");
}

export function detectPlatform(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return "小红书";
  if (host.includes("facebook.com") || host.includes("fb.watch") || host.includes("fb.com"))
    return "Facebook";
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("bilibili.com") || host.includes("b23.tv")) return "B站";
  if (host.includes("tiktok.com") || host.includes("douyin.com")) return "短视频";
  return "网页";
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // Link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // Multicast & reserved
  return false;
}

function isPrivateIp(rawIp: string): boolean {
  const ip = rawIp.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const v = net.isIP(ip);
  if (v === 4) return isPrivateIpv4(ip);
  if (v === 6) {
    if (ip === "::" || ip === "::1") return true;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // ULA fc00::/7
    if (/^fe[89ab]/.test(ip)) return true; // Link-local fe80::/10
    if (ip.startsWith("ff")) return true; // Multicast
    const mappedV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mappedV4) return isPrivateIpv4(mappedV4[1]);
    return false;
  }
  return true;
}

function isSafeHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) {
    return false;
  }
  if (net.isIP(h)) return !isPrivateIp(h);
  return true;
}

async function isSafePublicUrl(rawUrl: string): Promise<boolean> {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!isSafeHostname(host)) return false;
    if (!net.isIP(host)) {
      const addrs = await dns.lookup(host, { all: true });
      if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeHttpUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const candidate = raw.startsWith("//") ? `https:${raw}` : raw.trim();
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

async function fetchWithSafeRedirects(startUrl: string, headers: Record<string, string>): Promise<{ res: Response; finalUrl: string } | null> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isSafePublicUrl(current))) return null;
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      current = new URL(loc, current).toString();
      continue;
    }
    return { res, finalUrl: current };
  }
  return null;
}

async function readTextLimited(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remain = maxBytes - total;
      if (remain <= 0) {
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value.byteLength > remain ? value.subarray(0, remain) : value);
      total += value.byteLength;
      if (total >= maxBytes) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export function extractYoutubeId(rawUrl: string): string | undefined {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || undefined;
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = /^\/(shorts|embed|live)\/([^/?#]+)/.exec(u.pathname);
      if (m) return m[2];
    }
  } catch {
    // ignore
  }
  return undefined;
}

function safeFromCodePoint(cp: number, fallback: string): string {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(cp);
  } catch {
    return fallback;
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => safeFromCodePoint(parseInt(hex, 16), m))
    .replace(/&#(\d+);/g, (m, dec) => safeFromCodePoint(Number(dec), m));
}

function findMeta(html: string, keys: string[]): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
    }
    const name = (attrs.property || attrs.name || "").toLowerCase();
    if (keys.includes(name) && attrs.content?.trim()) {
      return decodeHtml(attrs.content.trim());
    }
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeHtml(m[1].replace(/\s+/g, " ").trim()) : undefined;
}

function extractVisibleText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtml(stripped).replace(/\s+/g, " ").trim().slice(0, 2200);
}

function isBlockedShell(title?: string, bodyText?: string, finalUrl?: string): boolean {
  const joined = `${title ?? ""} ${bodyText ?? ""} ${finalUrl ?? ""}`.toLowerCase();
  const patterns = [
    "log in to facebook",
    "login to facebook",
    "log into facebook",
    "you must log in to continue",
    "安全验证",
    "请先登录",
    "滑动验证",
    "just a moment",
    "access denied",
  ];
  if (patterns.some((p) => joined.includes(p))) return true;
  if (title && /^(facebook|instagram|小红书 - 你的生活兴趣社区)$/i.test(title.trim())) return true;
  return false;
}

function isGenericIcon(imageUrl?: string): boolean {
  if (!imageUrl) return true;
  const low = imageUrl.toLowerCase();
  return (
    low.includes("fb_icon") ||
    low.includes("rsrc.php") ||
    low.includes("favicon") ||
    (low.includes("logo") && low.endsWith(".svg"))
  );
}

export async function extractLinkInfo(rawText: string): Promise<ExtractedLinkInfo> {
  const sourceUrl = extractFirstUrl(rawText);
  if (!sourceUrl) {
    return { platform: "文字描述", fetched: false, blocked: false };
  }
  const platform = detectPlatform(sourceUrl);
  if (!(await isSafePublicUrl(sourceUrl))) {
    return { sourceUrl, platform, fetched: false, blocked: true };
  }

  const ytId = extractYoutubeId(sourceUrl);
  const info: ExtractedLinkInfo = {
    sourceUrl,
    platform,
    fetched: false,
    blocked: false,
    imageUrl: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined,
  };

  const oembedPromise = ytId
    ? (async () => {
        const canonical = `https://www.youtube.com/watch?v=${ytId}`;
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!oembedRes.ok) return null;
        return (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
      })()
    : Promise.resolve(null);

  const htmlPromise = fetchWithSafeRedirects(sourceUrl, {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  const [oembedResult, htmlResult] = await Promise.allSettled([oembedPromise, htmlPromise]);

  if (oembedResult.status === "fulfilled" && oembedResult.value) {
    const data = oembedResult.value;
    info.fetched = true;
    info.title = data.title;
    info.author = data.author_name;
    const safeThumb = sanitizeHttpUrl(data.thumbnail_url);
    if (safeThumb) info.imageUrl = safeThumb;
  }

  if (htmlResult.status === "fulfilled" && htmlResult.value) {
    try {
      const { res, finalUrl } = htmlResult.value;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          info.blocked = !info.fetched;
        }
        return info;
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
        return info;
      }

      const html = await readTextLimited(res, MAX_HTML_BYTES);
      const ogTitle = findMeta(html, ["og:title", "twitter:title"]) ?? extractTitle(html);
      const desc = findMeta(html, ["og:description", "description", "twitter:description"]);
      const ogImage = findMeta(html, ["og:image", "twitter:image", "twitter:image:src"]);
      const bodyText = extractVisibleText(html);

      if (isBlockedShell(ogTitle, bodyText, finalUrl)) {
        if (!info.fetched) info.blocked = true;
        return info;
      }

      info.fetched = true;
      if (!info.title && ogTitle) info.title = ogTitle;
      if (desc) info.description = desc;
      const safeOgImage = sanitizeHttpUrl(ogImage);
      if (!info.imageUrl && safeOgImage && !isGenericIcon(safeOgImage)) {
        info.imageUrl = safeOgImage;
      }
      if (ytId) {
        const shortDesc = /"shortDescription"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(html);
        if (shortDesc) {
          try {
            info.bodyText = JSON.parse(`"${shortDesc[1]}"`).slice(0, 2500);
          } catch {
            info.bodyText = bodyText;
          }
        } else {
          info.bodyText = bodyText;
        }
      } else {
        info.bodyText = bodyText;
      }
    } catch {
      if (!info.fetched) info.blocked = true;
    }
  } else {
    if (!info.fetched) info.blocked = true;
  }

  return info;
}
