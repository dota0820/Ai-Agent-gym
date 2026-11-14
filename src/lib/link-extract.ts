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

function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h === "::1" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
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
    low.includes("logo") && low.endsWith(".svg")
  );
}

export async function extractLinkInfo(rawText: string): Promise<ExtractedLinkInfo> {
  const sourceUrl = extractFirstUrl(rawText);
  if (!sourceUrl) {
    return { platform: "文字描述", fetched: false, blocked: false };
  }
  const platform = detectPlatform(sourceUrl);
  if (!isSafePublicUrl(sourceUrl)) {
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

  if (ytId) {
    try {
      const canonical = `https://www.youtube.com/watch?v=${ytId}`;
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        info.fetched = true;
        info.title = data.title;
        info.author = data.author_name;
        if (data.thumbnail_url) info.imageUrl = data.thumbnail_url;
      }
    } catch {
      // fall through to HTML fetch
    }
  }

  try {
    const res = await fetch(sourceUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
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

    const html = (await res.text()).slice(0, 450_000);
    const ogTitle = findMeta(html, ["og:title", "twitter:title"]) ?? extractTitle(html);
    const desc = findMeta(html, ["og:description", "description", "twitter:description"]);
    const ogImage = findMeta(html, ["og:image", "twitter:image", "twitter:image:src"]);
    const bodyText = extractVisibleText(html);

    if (isBlockedShell(ogTitle, bodyText, res.url)) {
      if (!info.fetched) info.blocked = true;
      return info;
    }

    info.fetched = true;
    if (!info.title && ogTitle) info.title = ogTitle;
    if (desc) info.description = desc;
    if (!info.imageUrl && ogImage && !isGenericIcon(ogImage)) {
      info.imageUrl = ogImage.startsWith("//") ? `https:${ogImage}` : ogImage;
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

  return info;
}
