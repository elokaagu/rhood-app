/**
 * Brands and DJs may chat when they share an opportunity application,
 * even if they are not accepted Connections yet.
 */
import { supabase } from "./supabase";

export async function hasApplicationConversationAccess(otherUserId) {
  if (!otherUserId) return false;
  try {
    const { data, error } = await supabase.rpc(
      "has_application_conversation_access",
      { other_user_id: otherUserId }
    );
    if (error) {
      if (__DEV__) {
        console.warn(
          "[hasApplicationConversationAccess]",
          error.message || error
        );
      }
      return false;
    }
    return data === true;
  } catch (err) {
    if (__DEV__) {
      console.warn("[hasApplicationConversationAccess]", err);
    }
    return false;
  }
}
