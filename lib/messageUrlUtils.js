/**
 * URL parsing for chat messages (link detection + link preview normalization).
 */

export const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;

export const stripTrailingPunctuation = (url = "") =>
  url.replace(/[),.;!?]+$/g, "");

export const extractUrls = (text = "") => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return [
    ...new Set(
      matches
        .map((match) => stripTrailingPunctuation(match.trim()))
        .filter(Boolean)
    ),
  ];
};

export const resolveRelativeUrl = (maybeRelative = "", baseUrl = "") => {
  try {
    if (!maybeRelative) return "";
    const trimmed = maybeRelative.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (baseUrl) {
      const base = new URL(baseUrl);
      return new URL(trimmed, base).toString();
    }
    return trimmed;
  } catch (error) {
    if (__DEV__) {
      console.warn("resolveRelativeUrl error", { maybeRelative, baseUrl, error });
    }
    return String(maybeRelative || "").trim() || "";
  }
};
