/**
 * Fetches Open Graph / basic HTML metadata for in-chat link preview cards.
 */
import { resolveRelativeUrl } from "./messageUrlUtils";

const LINK_PREVIEW_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 120000;

function debugPreviewWarn(message, details) {
  if (__DEV__) {
    console.warn(message, details);
  }
}

function decodeHtmlEntities(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function parseMetaAttributes(tagSource) {
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_:\-.]*)\s*=\s*["']([^"']*)["']/g;
  let match = null;
  while ((match = attrRegex.exec(tagSource))) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}

function collectMetaContents(html) {
  const byProperty = Object.create(null);
  const byName = Object.create(null);
  const metaTagRegex = /<meta\b[^>]*>/gi;
  let tagMatch = null;
  while ((tagMatch = metaTagRegex.exec(html))) {
    const tag = tagMatch[0];
    const attrs = parseMetaAttributes(tag);
    const content = attrs.content || "";
    if (!content) continue;
    if (attrs.property) {
      byProperty[attrs.property.toLowerCase()] = content;
    }
    if (attrs.name) {
      byName[attrs.name.toLowerCase()] = content;
    }
  }
  return { byProperty, byName };
}

/**
 * @param {string} rawUrl
 * @returns {Promise<null | { url: string, title: string, description: string, image: string, siteName: string }>}
 */
export async function fetchLinkPreview(rawUrl) {
  if (!rawUrl) return null;

  let targetUrl = rawUrl.trim();
  if (!targetUrl) return null;
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LINK_PREVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      debugPreviewWarn("Link preview request failed", {
        url: targetUrl,
        status: response.status,
      });
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let hostname = "";
    try {
      hostname = new URL(targetUrl).hostname.replace(/^www\./i, "");
    } catch (error) {
      debugPreviewWarn("Unable to parse URL hostname", { targetUrl, error });
    }
    const fallbackLabel = hostname || targetUrl;

    if (contentType.startsWith("image/")) {
      return {
        url: targetUrl,
        title: fallbackLabel,
        description: "",
        image: targetUrl,
        siteName: fallbackLabel,
      };
    }

    const isHtmlLike =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") ||
      contentType.startsWith("text/");
    if (!isHtmlLike) {
      return {
        url: targetUrl,
        title: fallbackLabel,
        description: "",
        image: "",
        siteName: fallbackLabel,
      };
    }

    const html = await response.text();
    const truncatedHtml = html.slice(0, MAX_HTML_CHARS);
    const metaContent = collectMetaContents(truncatedHtml);

    const getMetaContent = (key) => {
      if (!key) return "";
      const normalizedKey = String(key).toLowerCase();
      return (
        metaContent.byProperty[normalizedKey] ||
        metaContent.byName[normalizedKey] ||
        ""
      );
    };

    const getTitleTag = () => {
      const titleMatch = truncatedHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1]) return titleMatch[1];
      return "";
    };

    const title =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      getTitleTag() ||
      fallbackLabel;

    const description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      "";

    const siteName =
      getMetaContent("og:site_name") ||
      getMetaContent("twitter:site") ||
      fallbackLabel ||
      "";

    let imageUrl =
      getMetaContent("og:image:secure_url") ||
      getMetaContent("og:image:url") ||
      getMetaContent("og:image") ||
      getMetaContent("twitter:image") ||
      getMetaContent("twitter:image:src") ||
      "";

    imageUrl = resolveRelativeUrl(imageUrl, targetUrl);

    return {
      url: targetUrl,
      title: decodeHtmlEntities(title).trim(),
      description: decodeHtmlEntities(description).trim(),
      image: imageUrl,
      siteName: decodeHtmlEntities(siteName).trim() || fallbackLabel,
    };
  } catch (error) {
    debugPreviewWarn("Link preview fetch error", { url: rawUrl, error });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
