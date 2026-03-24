import { useEffect } from "react";
import { supabase, db } from "../lib/supabase";
import {
  transformDirectMessageFromRealtime,
  transformGroupMessageFromRealtime,
} from "../lib/messagesScreen/messageTransforms";

/**
 * Subscribes to new direct or group messages and appends to local state.
 * Waits for `loading === false` (including when the screen hydrated from an in-memory snapshot)
 * so the initial network fetch and subscription don’t fight; the fetch still reconciles the list
 * shortly after open.
 */
export function useMessagesRealtimeSubscription({
  userId,
  chatType,
  threadId,
  communityId,
  loading,
  setMessages,
  scrollViewRef,
}) {
  useEffect(() => {
    const profileCache = new Map();

    if (!userId || loading) return;

    let isActive = true;
    let scrollRafId = null;

    const getProfile = async (profileId) => {
      if (!profileId) return null;
      if (profileCache.has(profileId)) {
        return profileCache.get(profileId);
      }
      const profile = await db.getUserProfilePublic(profileId);
      if (!isActive) return null;
      profileCache.set(profileId, profile ?? null);
      return profile;
    };

    const appendMessage = (newMessage) => {
      if (!isActive) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    };

    /** Coalesces rapid inserts into one scroll; uses rAF instead of a fixed timeout. */
    const scheduleScrollToEnd = () => {
      if (scrollRafId != null) {
        cancelAnimationFrame(scrollRafId);
      }
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        if (!isActive) return;
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    };

    const handleDirectInsert = async (payload) => {
      if (__DEV__) console.log("📨 New message received:", payload.new);
      const senderProfile = await getProfile(payload.new.sender_id);
      if (!isActive) return;

      const newMessage = transformDirectMessageFromRealtime(
        payload.new,
        senderProfile,
        userId
      );
      appendMessage(newMessage);
      scheduleScrollToEnd();
    };

    const handleGroupInsert = async (payload) => {
      if (__DEV__) console.log("📨 New group message received:", payload.new);
      const senderProfile = await getProfile(payload.new.author_id);
      if (!isActive) return;

      const newMessage = transformGroupMessageFromRealtime(
        payload.new,
        senderProfile,
        userId
      );
      appendMessage(newMessage);
      scheduleScrollToEnd();
    };

    let channel;

    if (chatType === "individual" && threadId) {
      if (__DEV__) console.log("🔔 Setting up real-time subscription for thread:", threadId);

      channel = supabase
        .channel(`messages-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            void handleDirectInsert(payload);
          }
        )
        .subscribe((status, err) => {
          if (__DEV__ && err) {
            console.warn("Messages realtime subscription:", status, err);
          }
        });
    } else if (chatType === "group" && communityId) {
      channel = supabase
        .channel(`group-messages-${communityId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "community_posts",
            filter: `community_id=eq.${communityId}`,
          },
          (payload) => {
            void handleGroupInsert(payload);
          }
        )
        .subscribe((status, err) => {
          if (__DEV__ && err) {
            console.warn("Group messages realtime subscription:", status, err);
          }
        });
    }

    return () => {
      isActive = false;
      if (scrollRafId != null) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
      if (channel) {
        if (__DEV__) console.log("🔕 Cleaning up subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [userId, chatType, threadId, communityId, loading, setMessages, scrollViewRef]);
}
