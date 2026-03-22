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
  isConnecting = false,
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
            <Text style={styles.discoverName}>{String(user.name || "")}</Text>
          </View>
          <Text style={styles.discoverUsername}>{String(user.username || "")}</Text>
          <Text style={styles.discoverLocation}>{String(user.location || "")}</Text>
          {String(user.statusMessage || "").trim() ? (
            <Text style={styles.discoverStatus} numberOfLines={1}>
              {String(user.statusMessage || "")}
            </Text>
          ) : null}
        </View>
        <View style={styles.discoverRatingSection}>
          <Text style={styles.discoverLastActive}>
            {user.isOnline === true
              ? "Online now"
              : String(user.lastActive || "")}
          </Text>
        </View>
      </View>

      <View style={styles.discoverGenres}>
        {(Array.isArray(user.genres) ? user.genres.slice(0, 3) : []).map(
          (genre, idx) => (
            <View
              key={`${user.id}-${String(genre)}-${idx}`}
              style={styles.discoverGenreTag}
            >
              <Ionicons
                name="musical-notes"
                size={12}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.discoverGenreText}>{String(genre || "")}</Text>
            </View>
          )
        )}
      </View>

      <View style={styles.discoverActions}>
        <TouchableOpacity
          style={styles.discoverViewProfileButton}
          onPress={() => onViewProfile?.(user)}
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
            style={[styles.discoverConnectButton, styles.discoverMessageButton]}
            onPress={() =>
              onConnectionPress?.({
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
              isPending ? onCancelPending?.(user) : onConnect?.(user)
            }
            disabled={isPending ? isCancelling : isConnecting}
          >
            {isPending && isCancelling ? (
              <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
            ) : !isPending && isConnecting ? (
              <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
            ) : (
              <Ionicons
                name={isPending ? "close" : "add"}
                size={16}
                color={isPending ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 0%)"}
              />
            )}
            <Text
              style={[
                styles.discoverConnectText,
                isPending && styles.discoverPendingText,
              ]}
            >
              {isPending
                ? isCancelling
                  ? "Cancelling..."
                  : "Cancel Request"
                : isConnecting
                  ? "Connecting..."
                  : "Connect"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const CardWrapper = user.isConnected ? Pressable : View;
  const cardWrapperProps = user.isConnected
    ? {
        style: styles.discoverCard,
        onLongPress: () => onLongPress?.(user),
        delayLongPress: 350,
      }
    : { style: styles.discoverCard };

  return <CardWrapper {...cardWrapperProps}>{cardBody}</CardWrapper>;
}

export default memo(DiscoverUserCard);
