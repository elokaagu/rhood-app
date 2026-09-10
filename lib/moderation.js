/**
 * Account deletion, block, and report — App Store 5.1.1 / 1.2.
 */
import { Alert, Platform } from "react-native";
import { supabase } from "./supabase";

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Something else" },
];

export async function deleteOwnAccount() {
  const { data, error } = await supabase.rpc("delete_own_account");
  if (error) {
    throw error;
  }
  return data;
}

export async function blockUser(blockedId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !blockedId || user.id === blockedId) {
    throw new Error("Unable to block this user.");
  }
  const { error } = await supabase.from("blocked_users").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });
  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function listBlockedUserIds() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", user.id);
  if (error) {
    if (__DEV__) console.warn("[listBlockedUserIds]", error.message);
    return [];
  }
  return (data || []).map((row) => row.blocked_id).filter(Boolean);
}

export async function listBlockedUserIdsEitherWay() {
  const { data, error } = await supabase.rpc("blocked_user_ids_either_way");
  if (!error && Array.isArray(data)) {
    return data.filter(Boolean);
  }
  return listBlockedUserIds();
}

export async function isMessagingBlockedWith(otherUserId) {
  if (!otherUserId) return false;
  const { data, error } = await supabase.rpc("messaging_blocked_with", {
    other_id: otherUserId,
  });
  if (!error) return !!data;
  const blocked = await listBlockedUserIdsEitherWay();
  return blocked.includes(otherUserId);
}

export async function assertCanMessageUser(otherUserId) {
  if (await isMessagingBlockedWith(otherUserId)) {
    throw new Error("You can't message this person.");
  }
}

export async function reportContent({
  targetType,
  targetId,
  targetUserId,
  reason,
  details,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Sign in to report content.");
  }
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: user.id,
    target_user_id: targetUserId || null,
    target_type: targetType,
    target_id: targetId ? String(targetId) : null,
    reason: reason || "other",
    details: details || null,
  });
  if (error) throw error;
}

export function promptReport({ targetType, targetId, targetUserId, onDone }) {
  const send = async (reasonId) => {
    try {
      await reportContent({
        targetType,
        targetId,
        targetUserId,
        reason: reasonId,
      });
      Alert.alert(
        "Report sent",
        "Thanks. Our team will review this. You can also block this person from their profile."
      );
      onDone?.();
    } catch (error) {
      Alert.alert(
        "Couldn't send report",
        error?.message || "Please try again."
      );
    }
  };

  if (Platform.OS === "ios") {
    Alert.alert("Report", "Why are you reporting this?", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason.label,
        onPress: () => send(reason.id),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
    return;
  }

  Alert.alert("Report", "Why are you reporting this?", [
    { text: "Spam", onPress: () => send("spam") },
    {
      text: "More…",
      onPress: () => {
        Alert.alert("Report", "Choose a reason", [
          { text: "Harassment", onPress: () => send("harassment") },
          { text: "Inappropriate", onPress: () => send("inappropriate") },
          { text: "Something else", onPress: () => send("other") },
        ]);
      },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

export function promptBlockUser({ userId, name, onBlocked }) {
  const label = name ? `Block ${name}?` : "Block this user?";
  Alert.alert(
    label,
    "You won't see their profile in Discover or in Messages. They won't be notified.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(userId);
            Alert.alert("Blocked", "You can still delete your account in Settings if you need to leave R/HOOD.");
            onBlocked?.();
          } catch (error) {
            Alert.alert("Couldn't block", error?.message || "Please try again.");
          }
        },
      },
    ]
  );
}
