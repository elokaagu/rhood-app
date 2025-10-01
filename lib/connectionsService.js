// lib/connectionsService.js
// Connection and messaging service for R/HOOD app

import { supabase } from "./supabase";

export const connectionsService = {
  // ===== CONNECTION MANAGEMENT =====

  /**
   * Follow a user
   */
  async followUser(userIdToFollow) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("connections")
        .insert({
          follower_id: user.id,
          following_id: userIdToFollow,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error following user:", error);
      throw error;
    }
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userIdToUnfollow) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userIdToUnfollow);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error unfollowing user:", error);
      throw error;
    }
  },

  /**
   * Check if current user follows another user
   */
  async isFollowing(userId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("connections")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  },

  /**
   * Get user's followers
   */
  async getFollowers(userId) {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select(
          `
          follower_id,
          created_at,
          user_profiles!connections_follower_id_fkey (
            id,
            dj_name,
            profile_image_url,
            city,
            genres
          )
        `
        )
        .eq("following_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((conn) => ({
        ...conn.user_profiles,
        followedAt: conn.created_at,
      }));
    } catch (error) {
      console.error("Error fetching followers:", error);
      throw error;
    }
  },

  /**
   * Get users that current user follows
   */
  async getFollowing(userId) {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select(
          `
          following_id,
          created_at,
          user_profiles!connections_following_id_fkey (
            id,
            dj_name,
            profile_image_url,
            city,
            genres
          )
        `
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((conn) => ({
        ...conn.user_profiles,
        followedAt: conn.created_at,
      }));
    } catch (error) {
      console.error("Error fetching following:", error);
      throw error;
    }
  },

  /**
   * Get mutual connections between two users
   */
  async getMutualConnections(userId1, userId2) {
    try {
      const { data, error } = await supabase.rpc("get_mutual_connections", {
        user1_id: userId1,
        user2_id: userId2,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching mutual connections:", error);
      return [];
    }
  },

  // ===== USER DISCOVERY =====

  /**
   * Search users by name, username, or location
   */
  async searchUsers(query, limit = 20) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .or(
          `dj_name.ilike.%${query}%,city.ilike.%${query}%`
        )
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },

  /**
   * Get recommended users to follow
   */
  async getRecommendedUsers(limit = 10) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get all users except current user
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit * 2); // Get more to account for filtering

      if (error) throw error;

      // Get users that the current user is already following
      const { data: followingData, error: followingError } = await supabase
        .from("connections")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) {
        console.warn("Could not fetch following list:", followingError);
        // Return all users if we can't check following status
        return data.slice(0, limit);
      }

      const followingIds = new Set(
        followingData.map((conn) => conn.following_id)
      );

      // Filter out users that are already being followed
      const recommended = data.filter((user) => !followingIds.has(user.id));

      return recommended.slice(0, limit);
    } catch (error) {
      console.error("Error fetching recommended users:", error);
      throw error;
    }
  },

  // ===== MESSAGE THREADS =====

  /**
   * Get all message threads for current user
   */
  async getMessageThreads() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("message_threads")
        .select(
          `
          *,
            participant_1_profile:user_profiles!message_threads_participant_1_fkey (
              id,
              dj_name,
              profile_image_url
            ),
            participant_2_profile:user_profiles!message_threads_participant_2_fkey (
              id,
              dj_name,
              profile_image_url
            )
        `
        )
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      return data.map((thread) => {
        const otherParticipant =
          thread.participant_1 === user.id
            ? thread.participant_2_profile
            : thread.participant_1_profile;

        const unreadCount =
          thread.participant_1 === user.id
            ? thread.unread_count_participant_1
            : thread.unread_count_participant_2;

        return {
          ...thread,
          otherParticipant,
          unreadCount,
          lastMessageSender:
            thread.last_message_sender_id === user.id ? "me" : "other",
        };
      });
    } catch (error) {
      console.error("Error fetching message threads:", error);
      throw error;
    }
  },

  /**
   * Get or create a message thread between two users
   */
  async getOrCreateThread(otherUserId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if thread already exists
      const { data: existingThread, error: selectError } = await supabase
        .from("message_threads")
        .select("*")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
        )
        .single();

      if (existingThread) {
        return existingThread;
      }

      // Create new thread
      const { data: newThread, error: insertError } = await supabase
        .from("message_threads")
        .insert({
          participant_1: user.id < otherUserId ? user.id : otherUserId,
          participant_2: user.id < otherUserId ? otherUserId : user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newThread;
    } catch (error) {
      console.error("Error getting/creating thread:", error);
      throw error;
    }
  },

  // ===== MESSAGING =====

  /**
   * Send a message
   */
  async sendMessage(receiverId, content, messageType = "text") {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  /**
   * Get messages for a thread
   */
  async getMessages(threadId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
            sender:user_profiles!messages_sender_id_fkey (
              id,
              dj_name,
              profile_image_url
            )
        `
        )
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(threadId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.rpc("mark_messages_as_read", {
        thread_uuid: threadId,
        user_uuid: user.id,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error marking messages as read:", error);
      throw error;
    }
  },

  // ===== REALTIME SUBSCRIPTIONS =====

  /**
   * Subscribe to new messages in a thread
   */
  subscribeToMessages(threadId, callback) {
    return supabase
      .channel(`messages:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to message thread updates
   */
  subscribeToThreadUpdates(userId, callback) {
    return supabase
      .channel(`threads:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_threads",
          filter: `or(participant_1.eq.${userId},participant_2.eq.${userId})`,
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to connection updates
   */
  subscribeToConnections(userId, callback) {
    return supabase
      .channel(`connections:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `or(follower_id.eq.${userId},following_id.eq.${userId})`,
        },
        callback
      )
      .subscribe();
  },
};
