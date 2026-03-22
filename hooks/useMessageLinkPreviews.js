import { useState, useEffect, useRef, useCallback } from "react";
import { fetchLinkPreview } from "../lib/fetchLinkPreview";
import { stripTrailingPunctuation } from "../lib/messageUrlUtils";

/**
 * Loads link preview metadata for URLs attached to chat messages.
 *
 * @param {Array<{ id: string, urls?: string[] }>} messages
 * @param {string} conversationKey - e.g. `${djId}|${communityId}|${chatType}`; clears cache when it changes
 */
export function useMessageLinkPreviews(messages, conversationKey) {
  const [messageLinkPreviews, setMessageLinkPreviews] = useState({});
  const linkPreviewCacheRef = useRef({});

  const discardPreviewsForMessage = useCallback((messageId) => {
    if (messageId == null) return;
    setMessageLinkPreviews((prev) => {
      if (!prev[messageId]) return prev;
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
    const prefix = `${messageId}|`;
    Object.keys(linkPreviewCacheRef.current).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete linkPreviewCacheRef.current[key];
      }
    });
  }, []);

  useEffect(() => {
    setMessageLinkPreviews({});
    linkPreviewCacheRef.current = {};
  }, [conversationKey]);

  useEffect(() => {
    if (!messages.length) return;

    messages.forEach((message) => {
      if (!message?.urls?.length) return;

      message.urls.forEach((rawUrl) => {
        const normalizedUrl = stripTrailingPunctuation(rawUrl);
        if (!normalizedUrl) return;

        const cacheKey = `${message.id}|${normalizedUrl}`;
        if (linkPreviewCacheRef.current[cacheKey]) {
          return;
        }

        linkPreviewCacheRef.current[cacheKey] = "pending";

        fetchLinkPreview(normalizedUrl)
          .then((preview) => {
            if (!preview) {
              linkPreviewCacheRef.current[cacheKey] = null;
              return;
            }

            const previewData = {
              url: normalizedUrl,
              title: preview.title || normalizedUrl,
              description: preview.description || "",
              image: preview.image || "",
              siteName: preview.siteName || "",
            };

            linkPreviewCacheRef.current[cacheKey] = previewData;

            setMessageLinkPreviews((prev) => {
              const current = prev[message.id] || [];
              if (current.some((item) => item.url === previewData.url)) {
                return prev;
              }
              return {
                ...prev,
                [message.id]: [...current, previewData],
              };
            });
          })
          .catch((error) => {
            console.warn("Link preview lookup failed", {
              url: normalizedUrl,
              error,
            });
            linkPreviewCacheRef.current[cacheKey] = null;
          });
      });
    });
  }, [messages]);

  return { messageLinkPreviews, discardPreviewsForMessage };
}
