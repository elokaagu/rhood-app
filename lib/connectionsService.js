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
        .or(`dj_name.ilike.%${query}%,city.ilike.%${query}%`)
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

      // Debug: Log the first user to see what fields are available
      if (data && data.length > 0) {
        console.log("🔍 First recommended user data:", data[0]);
        console.log("🔍 Profile image URL field:", data[0].profile_image_url);
        console.log("🔍 Image URL field:", data[0].image_url);
      }

      // Get users that the current user is already connected to
      const { data: connectionData, error: connectionError } = await supabase
        .from("connections")
        .select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (connectionError) {
        console.warn("Could not fetch connection list:", connectionError);
        // Return all users if we can't check connection status
        return data.slice(0, limit);
      }

      const connectedIds = new Set();
      connectionData.forEach((conn) => {
        if (conn.user_id_1 === user.id) {
          connectedIds.add(conn.user_id_2);
        } else if (conn.user_id_2 === user.id) {
          connectedIds.add(conn.user_id_1);
        }
      });

      // Filter out users that are already connected
      const recommended = data.filter((user) => !connectedIds.has(user.id));

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

      // First, try to get threads with full data
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

      if (error) {
        console.warn("Could not fetch message threads:", error);
        // Fallback: return empty array if table doesn't exist yet
        return [];
      }

      return data.map((thread) => {
        const otherParticipant =
          thread.participant_1 === user.id
            ? thread.participant_2_profile
            : thread.participant_1_profile;

        // Handle missing unread count columns gracefully
        const unreadCount =
          thread.participant_1 === user.id
            ? thread.unread_count_participant_1 || 0
            : thread.unread_count_participant_2 || 0;

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
      return [];
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

      if (insertError) {
        console.warn("Could not create thread:", insertError);
        // Return a mock thread if table doesn't exist yet
        return {
          id: `mock-thread-${user.id}-${otherUserId}`,
          participant_1: user.id < otherUserId ? user.id : otherUserId,
          participant_2: user.id < otherUserId ? otherUserId : user.id,
        };
      }

      return newThread;
    } catch (error) {
      console.error("Error getting/creating thread:", error);
      // Return a mock thread if there's any error
      return {
        id: `mock-thread-${user.id}-${otherUserId}`,
        participant_1: user.id < otherUserId ? user.id : otherUserId,
        participant_2: user.id < otherUserId ? otherUserId : user.id,
      };
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
      // If it's a mock thread ID, return empty array
      if (threadId.startsWith("mock-thread-")) {
        return [];
      }

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

      if (error) {
        console.warn("Could not fetch messages:", error);
        // Fallback: try without thread_id filter if column doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
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
          .order("created_at", { ascending: true })
          .limit(limit);

        if (fallbackError) {
          console.warn(
            "Could not fetch messages without thread filter:",
            fallbackError
          );
          return [];
        }

        return fallbackData || [];
      }

      return data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
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

      // If it's a mock thread ID, just return success
      if (threadId.startsWith("mock-thread-")) {
        return true;
      }

      const { error } = await supabase.rpc("mark_messages_as_read", {
        thread_uuid: threadId,
        user_uuid: user.id,
      });

      if (error) {
        console.warn("Could not mark messages as read:", error);
        // Fallback: just mark messages as read without updating thread counts
        const { error: fallbackError } = await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false);

        if (fallbackError) {
          console.warn(
            "Could not mark messages as read (fallback):",
            fallbackError
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return true; // Return true to not block the UI
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

  // ===== GROUP CHAT MANAGEMENT =====

  /**
   * Get group messages for a community
   */
  async getGroupMessages(communityId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from("group_messages")
        .select(
          `
          *,
          sender:user_profiles!group_messages_sender_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error("Error fetching group messages:", error);
      throw error;
    }
  },

  /**
   * Send a group message
   */
  async sendGroupMessage(communityId, content) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          community_id: communityId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select(
          `
          *,
          sender:user_profiles!group_messages_sender_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending group message:", error);
      throw error;
    }
  },

  /**
   * Get all communities
   */
  async getAllCommunities() {
    try {
      const { data, error } = await supabase
        .from("communities")
        .select(
          `
          id,
          name,
          description,
          member_count,
          created_at,
          created_by,
          user_profiles!communities_created_by_fkey (
            dj_name,
            profile_image_url
          )
        `
        )
        .order("member_count", { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format
      const transformedCommunities = await Promise.all(
        (data || []).map(async (community) => {
          // Check if current user is a member
          const isMember = await this.isCommunityMember(community.id);

          // Get recent member avatars (sample from user_profiles)
          const { data: recentMembers } = await supabase
            .from("community_members")
            .select(
              `
              user_profiles!community_members_user_id_fkey (
                profile_image_url
              )
            `
            )
            .eq("community_id", community.id)
            .limit(5);

          const memberAvatars = (recentMembers || [])
            .map((member) => member.user_profiles?.profile_image_url)
            .filter(Boolean);

          return {
            id: community.id,
            name: community.name,
            description: community.description,
            memberCount: community.member_count || 0,
            genre: "Electronic", // Default genre - you can add this to the database schema
            location: "Global", // Default location - you can add this to the database schema
            isJoined: isMember,
            isTrending: community.member_count > 1000, // Consider trending if > 1000 members
            recentActivity: "Recently active", // You can add last_activity to the schema
            featuredContent: `Welcome to ${community.name}!`,
            communityImage:
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop",
            memberAvatars,
            createdDate: new Date(community.created_at).toLocaleDateString(),
            lastPost: `New activity in ${community.name}`,
          };
        })
      );

      return transformedCommunities;
    } catch (error) {
      console.error("Error fetching communities:", error);
      return [];
    }
  },

  /**
   * Get communities that the current user is a member of
   */
  async getUserCommunities() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("community_members")
        .select(
          `
          *,
          community:communities!community_members_community_id_fkey(
            id,
            name,
            description,
            member_count,
            image_url,
            created_at
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((item) => item.community);
    } catch (error) {
      console.error("Error fetching user communities:", error);
      throw error;
    }
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("community_members")
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: "member",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error joining community:", error);
      throw error;
    }
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error leaving community:", error);
      throw error;
    }
  },

  /**
   * Check if user is a member of a community
   */
  async isCommunityMember(communityId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
      return !!data;
    } catch (error) {
      console.error("Error checking community membership:", error);
      return false;
    }
  },

  /**
   * Subscribe to group messages for real-time updates
   */
  subscribeToGroupMessages(communityId, callback) {
    return supabase
      .channel(`group_messages:${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `community_id=eq.${communityId}`,
        },
        callback
      )
      .subscribe();
  },
};
