/**
 * Fetches thread + messages for MessagesScreen (individual or group).
 */
import { transformDirectMessageFromQuery, transformGroupMessageFromQuery } from "./messageTransforms";

/**
 * @returns {Promise<{ ok: true, payload } | { ok: false, code: string, error?: any }>}
 */
export async function loadIndividualThreadState({
  userId,
  djId,
  supabase,
  db,
}) {
  const currentThreadId = await db.findOrCreateIndividualMessageThread(
    userId,
    djId
  );

  if (!currentThreadId) {
    return { ok: false, code: "no_thread" };
  }

  const { data, error } = await supabase
    .from("messages")
    .select(
      `
            *,
            sender:user_profiles!messages_sender_id_fkey(
              id,
              dj_name,
              full_name,
              profile_image_url
            )
          `
    )
    .eq("thread_id", currentThreadId)
    .order("created_at", { ascending: true })
    .limit(1000);

  console.log("🔍 Full query result:", {
    count: data?.length || 0,
    error: error?.message,
    errorCode: error?.code,
  });

  if (error) {
    return { ok: false, code: "query_error", error };
  }

  if (!error && (!data || data.length === 0)) {
    console.log("⚠️ No messages found for thread:", currentThreadId);
    console.log("⚠️ This could mean:");
    console.log("   1. No messages have been sent yet");
    console.log("   2. RLS policies are blocking access");
    console.log("   3. Messages failed to insert due to constraint violations");
  }

  const messages = (data || []).map((msg) =>
    transformDirectMessageFromQuery(msg, userId)
  );

  const otherUserProfile = await db.getUserProfilePublic(djId);
  const connections = await db.getUserConnections(userId);
  const connection = connections.find(
    (conn) => conn.connected_user_id === djId
  );

  return {
    ok: true,
    payload: {
      threadId: currentThreadId,
      messages,
      otherUser: otherUserProfile || null,
      isConnected: connection?.connection_status === "accepted",
      connectionStatus: connection?.connection_status || null,
      memberCount: 0,
    },
  };
}

/**
 * @returns {Promise<{ ok: true, payload } | { ok: false, code: string, error?: any }>}
 */
export async function loadGroupThreadState({
  userId,
  communityId,
  supabase,
  db,
}) {
  const groupMessages = await db.getGroupMessages(communityId);
  const messages = (groupMessages || []).map((msg) =>
    transformGroupMessageFromQuery(msg, userId, communityId)
  );

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .single();

  if (communityError) {
    console.warn("Community fetch:", communityError);
  }

  let memberCount = 0;
  try {
    memberCount = (await db.getCommunityMemberCount(communityId)) || 0;
  } catch (countError) {
    console.error("Error fetching community member count:", countError);
  }

  return {
    ok: true,
    payload: {
      messages,
      community: community || null,
      memberCount,
      connectionStatus: null,
    },
  };
}
