import { useEffect } from "react";
import { supabase, db } from "../lib/supabase";
import {
  transformDirectMessageFromRealtime,
  transformGroupMessageFromRealtime,
} from "../lib/messagesScreen/messageTransforms";

/**
 * Subscribes to new direct or group messages and appends to local state.
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
    if (!userId || loading) return;

    let channel;

    if (chatType === "individual" && threadId) {
      console.log("🔔 Setting up real-time subscription for thread:", threadId);

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
          async (payload) => {
            console.log("📨 New message received:", payload.new);

            const senderProfile = await db.getUserProfilePublic(
              payload.new.sender_id
            );

            const newMessage = transformDirectMessageFromRealtime(
              payload.new,
              senderProfile,
              userId
            );

            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe();
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
          async (payload) => {
            console.log("📨 New group message received:", payload.new);

            const senderProfile = await db.getUserProfilePublic(
              payload.new.author_id
            );

            const newMessage = transformGroupMessageFromRealtime(
              payload.new,
              senderProfile,
              userId
            );

            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        console.log("🔕 Cleaning up subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [userId, chatType, threadId, communityId, loading, setMessages, scrollViewRef]);
}
