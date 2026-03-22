/**
 * Persists outbound chat messages (direct thread or group posts).
 */

function buildDirectBase(threadId, userId) {
  return {
    thread_id: threadId,
    sender_id: userId,
  };
}

function mapMediaToDirectRow(baseMessageData, mediaItem) {
  return {
    ...baseMessageData,
    content: "",
    message_type: mediaItem.type,
    media_url: mediaItem.url,
    media_filename: mediaItem.filename,
    media_size: mediaItem.size,
    media_mime_type: mediaItem.mimeType,
    thumbnail_url: mediaItem.thumbnailUrl,
    file_extension: mediaItem.extension,
    duration: mediaItem.duration,
  };
}

function mapMediaToGroupRow(communityId, userId, mediaItem) {
  return {
    community_id: communityId,
    author_id: userId,
    content: "",
    message_type: mediaItem.type,
    media_url: mediaItem.url,
    media_filename: mediaItem.filename,
    media_size: mediaItem.size,
    media_mime_type: mediaItem.mimeType,
    thumbnail_url: mediaItem.thumbnailUrl,
    file_extension: mediaItem.extension,
    duration: mediaItem.duration,
  };
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: any, rollback: { messageContent: string, mediaArray: array } }>}
 */
export async function sendIndividualChatMessages({
  supabase,
  db,
  userId,
  djId,
  threadId,
  messageContent,
  mediaArray,
}) {
  let currentThreadId = threadId;
  if (!currentThreadId) {
    currentThreadId = await db.findOrCreateIndividualMessageThread(
      userId,
      djId
    );
  }

  if (!currentThreadId) {
    return {
      ok: false,
      error: new Error("Failed to get thread ID"),
      rollback: { messageContent, mediaArray },
    };
  }

  const baseMessageData = buildDirectBase(currentThreadId, userId);

  if (messageContent) {
    const textMessageData = {
      ...baseMessageData,
      content: messageContent,
      message_type: "text",
    };

    const { error: textError } = await supabase
      .from("messages")
      .insert(textMessageData);

    if (textError) {
      console.error("❌ Error sending text message:", textError);
      return {
        ok: false,
        error: textError,
        rollback: { messageContent, mediaArray },
      };
    }
  }

  if (mediaArray.length > 0) {
    const mediaMessages = mediaArray.map((item) =>
      mapMediaToDirectRow(baseMessageData, item)
    );

    const { error } = await supabase
      .from("messages")
      .insert(mediaMessages)
      .select("*");

    if (error) {
      console.error("❌ Error sending media messages:", error);
      return {
        ok: false,
        error,
        rollback: { messageContent, mediaArray },
      };
    }
  }

  return { ok: true, threadId: currentThreadId };
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: any, rollback: { messageContent: string, mediaArray: array } }>}
 */
export async function sendGroupChatMessages({
  supabase,
  userId,
  communityId,
  messageContent,
  mediaArray,
}) {
  if (messageContent) {
    const textMessageData = {
      community_id: communityId,
      author_id: userId,
      content: messageContent,
      message_type: "text",
    };

    const { error: textError } = await supabase
      .from("community_posts")
      .insert(textMessageData);

    if (textError) {
      console.error("❌ Error sending text message:", textError);
      console.error("❌ Error details:", {
        code: textError.code,
        message: textError.message,
        hint: textError.hint,
        details: textError.details,
      });
    }
  }

  if (mediaArray.length > 0) {
    const mediaMessages = mediaArray.map((item) =>
      mapMediaToGroupRow(communityId, userId, item)
    );

    const { error } = await supabase
      .from("community_posts")
      .insert(mediaMessages)
      .select("*");

    if (error) {
      console.error("❌ Error sending group media messages:", error);
      return {
        ok: false,
        error,
        rollback: { messageContent, mediaArray },
      };
    }
  }

  return { ok: true };
}
