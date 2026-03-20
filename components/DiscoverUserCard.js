import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";

/**
 * Single user card in the discover tab. Intentionally no per-item fade animation
 * so the FlatList stays smooth; use header/list-level motion instead.
 */
function DiscoverUserCard({
  user,
  onViewProfile,
  onConnectionPress,
  onConnect,
  onCancelPending,
  onLongPress,
  isPending,
  isCancelling,
  styles,
}) {
  const cardBody = (
    <>
        <View style={styles.discoverTopRow}>
          <View style={styles.discoverProfileContainer}>
            <ProgressiveImage
              source={
                user.profileImage &&
                typeof user.profileImage === "string" &&
                user.profileImage.trim()
                  ? { uri: user.profileImage.trim() }
                  : null
              }
              style={styles.discoverProfileImage}
              placeholder={
                <ProfileImagePlaceholder
                  size={80}
                  style={styles.discoverProfileImage}
                  name={user.name}
                />
              }
            />
            {user.isOnline === true ? (
              <View style={styles.discoverOnlineIndicator} />
            ) : null}
          </View>
          <View style={styles.discoverNameSection}>
            <View style={styles.discoverHeader}>
              <Text style={styles.discoverName}>
                {user.name != null ? String(user.name) : ""}
              </Text>
            </View>
            <Text style={styles.discoverUsername}>
              {user.username != null ? String(user.username) : ""}
            </Text>
            <Text style={styles.discoverLocation}>
              {user.location != null ? String(user.location) : ""}
            </Text>
            {user.statusMessage && String(user.statusMessage).trim() ? (
              <Text
                style={styles.discoverStatus}
                numberOfLines={1}
              >
                {String(user.statusMessage || "")}
              </Text>
            ) : null}
          </View>
          <View style={styles.discoverRatingSection}>
            <Text style={styles.discoverLastActive}>
              {user.lastActive != null ? String(user.lastActive) : ""}
            </Text>
          </View>
        </View>

        <View style={styles.discoverGenres}>
          {(Array.isArray(user.genres) ? user.genres.slice(0, 3) : []).map(
            (genre, idx) => (
              <View key={idx} style={styles.discoverGenreTag}>
                <Ionicons
                  name="musical-notes"
                  size={12}
                  color="hsl(75, 100%, 60%)"
                />
                <Text style={styles.discoverGenreText}>
                  {String(genre || "")}
                </Text>
              </View>
            )
          )}
        </View>

        <View style={styles.discoverActions}>
          <TouchableOpacity
            style={styles.discoverViewProfileButton}
            onPress={() => onViewProfile(user)}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color="hsl(0, 0%, 100%)"
            />
            <Text style={styles.discoverViewProfileText}>View Profile</Text>
          </TouchableOpacity>
          {user.isConnected ? (
            <TouchableOpacity
              style={[
                styles.discoverConnectButton,
                styles.discoverMessageButton,
              ]}
              onPress={() =>
                onConnectionPress({
                  id: user.id,
                  connectionId: user.connectionId,
                  threadId: user.threadId,
                })
              }
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color="hsl(0, 0%, 0%)"
              />
              <Text style={styles.discoverMessageText}>Message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.discoverConnectButton,
                isPending && styles.discoverPendingButton,
              ]}
              onPress={() =>
                isPending ? onCancelPending(user) : onConnect(user)
              }
              disabled={isPending && isCancelling}
            >
              {isPending && isCancelling ? (
                <ActivityIndicator
                  size="small"
                  color="hsl(75, 100%, 60%)"
                />
              ) : (
                <Ionicons
                  name={isPending ? "close" : "add"}
                  size={16}
                  color={
                    isPending ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 0%)"
                  }
                />
              )}
              <Text
                style={[
                  styles.discoverConnectText,
                  isPending && styles.discoverPendingText,
                ]}
              >
                {String(
                  isPending
                    ? isCancelling
                      ? "Cancelling..."
                      : "Cancel Request"
                    : "Connect"
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>
    </>
  );

  if (user.isConnected) {
    return (
      <Pressable
        style={styles.discoverCard}
        onLongPress={() => onLongPress(user)}
        delayLongPress={350}
      >
        {cardBody}
      </Pressable>
    );
  }

  return <View style={styles.discoverCard}>{cardBody}</View>;
}

export default memo(DiscoverUserCard);
