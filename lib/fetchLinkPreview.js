/**
 * Fetches Open Graph / basic HTML metadata for in-chat link preview cards.
 */
import { resolveRelativeUrl } from "./messageUrlUtils";

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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Link preview request failed", {
        url: targetUrl,
        status: response.status,
      });
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let hostname = targetUrl;
    try {
      hostname = new URL(targetUrl).hostname.replace(/^www\./i, "");
    } catch (error) {
      console.warn("Unable to parse URL hostname", { targetUrl, error });
    }

    if (contentType.startsWith("image/")) {
      return {
        url: targetUrl,
        title: hostname || targetUrl,
        description: "",
        image: targetUrl,
        siteName: hostname || targetUrl,
      };
    }

    const html = await response.text();
    const truncatedHtml = html.slice(0, 120000);

    const getMetaContent = (property) => {
      if (!property) return "";
      const propertyRegex = new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
        "i"
      );
      const nameRegex = new RegExp(
        `<meta[^>]+name=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
        "i"
      );
      const propertyMatch = truncatedHtml.match(propertyRegex);
      if (propertyMatch && propertyMatch[1]) return propertyMatch[1];
      const nameMatch = truncatedHtml.match(nameRegex);
      if (nameMatch && nameMatch[1]) return nameMatch[1];
      return "";
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
      hostname ||
      targetUrl;

    const description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      "";

    const siteName =
      getMetaContent("og:site_name") ||
      getMetaContent("twitter:site") ||
      hostname ||
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
      title: title.trim(),
      description: description.trim(),
      image: imageUrl,
      siteName: siteName.trim() || hostname || targetUrl,
    };
  } catch (error) {
    console.warn("Link preview fetch error", { url: rawUrl, error });
    return null;
  }
}
