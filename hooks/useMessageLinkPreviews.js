import { useState, useEffect, useRef, useCallback } from "react";
import { fetchLinkPreview } from "../lib/fetchLinkPreview";
import { stripTrailingPunctuation } from "../lib/messageUrlUtils";

/**
 * @typedef {{ url: string, title: string, description: string, image: string, siteName: string }} LinkPreviewData
 * @typedef {{ status: 'pending' }} PreviewEntryPending
 * @typedef {{ status: 'empty' }} PreviewEntryEmpty
 * @typedef {{ status: 'error', error: unknown }} PreviewEntryError
 * @typedef {{ status: 'ready', data: LinkPreviewData }} PreviewEntryReady
 * @typedef {PreviewEntryPending | PreviewEntryEmpty | PreviewEntryError | PreviewEntryReady} PreviewByUrlEntry
 */

/**
 * Loads link preview metadata for URLs attached to chat messages.
 * URL-level ref cache dedupes fetches across messages; React state stays per message id for the UI.
 *
 * @param {Array<{ id: string, urls?: string[] }>} messages
 * @param {string} conversationKey - e.g. `${djId}|${communityId}|${chatType}`; clears caches when it changes
 */
export function useMessageLinkPreviews(messages, conversationKey) {
  const [messageLinkPreviews, setMessageLinkPreviews] = useState({});
  const previewByUrlRef = useRef(
    /** @type {Record<string, PreviewByUrlEntry>} */ ({})
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const discardPreviewsForMessage = useCallback((messageId) => {
    if (messageId == null) return;
    setMessageLinkPreviews((prev) => {
      if (!prev[messageId]) return prev;
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }, []);

  useEffect(() => {
    setMessageLinkPreviews({});
    previewByUrlRef.current = {};
  }, [conversationKey]);

  useEffect(() => {
    let cancelled = false;

    if (!messages.length) {
      return () => {
        cancelled = true;
      };
    }

    const attachReadyPreviewToMessages = (normalizedUrl, previewData) => {
      if (cancelled) return;
      setMessageLinkPreviews((prev) => {
        const msgs = messagesRef.current;
        let next = { ...prev };
        let changed = false;
        for (const m of msgs) {
          if (!m?.id || !m.urls?.length) continue;
          const hasUrl = m.urls.some(
            (u) => stripTrailingPunctuation(u) === normalizedUrl
          );
          if (!hasUrl) continue;
          const cur = next[m.id] || [];
          if (cur.some((item) => item.url === previewData.url)) continue;
          next[m.id] = [...cur, previewData];
          changed = true;
        }
        return changed ? next : prev;
      });
    };

    messages.forEach((message) => {
      if (!message?.id || !message?.urls?.length) return;

      message.urls.forEach((rawUrl) => {
        const normalizedUrl = stripTrailingPunctuation(rawUrl);
        if (!normalizedUrl) return;

        const entry = previewByUrlRef.current[normalizedUrl];

        if (entry?.status === "ready") {
          attachReadyPreviewToMessages(normalizedUrl, entry.data);
          return;
        }
        if (entry?.status === "pending") {
          return;
        }
        if (entry?.status === "empty" || entry?.status === "error") {
          return;
        }

        previewByUrlRef.current[normalizedUrl] = { status: "pending" };

        fetchLinkPreview(normalizedUrl)
          .then((preview) => {
            if (cancelled) return;

            if (!preview) {
              previewByUrlRef.current[normalizedUrl] = { status: "empty" };
              return;
            }

            const previewData = {
              url: normalizedUrl,
              title: preview.title || normalizedUrl,
              description: preview.description || "",
              image: preview.image || "",
              siteName: preview.siteName || "",
            };

            previewByUrlRef.current[normalizedUrl] = {
              status: "ready",
              data: previewData,
            };

            attachReadyPreviewToMessages(normalizedUrl, previewData);
          })
          .catch((error) => {
            if (cancelled) return;
            console.warn("Link preview lookup failed", {
              url: normalizedUrl,
              error,
            });
            previewByUrlRef.current[normalizedUrl] = {
              status: "error",
              error,
            };
          });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [messages]);

  return { messageLinkPreviews, discardPreviewsForMessage };
}
