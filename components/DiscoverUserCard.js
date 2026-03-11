import React from "react";
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
import AnimatedListItem from "./AnimatedListItem";

/**
 * Single user card in the discover tab of ConnectionsScreen.
 */
export default function DiscoverUserCard({
  user,
  index,
  onViewProfile,
  onConnectionPress,
  onConnect,
  onCancelPending,
  onLongPress,
  isPending,
  isCancelling,
  discoverLoading,
  styles,
}) {
  const pressableProps = user.isConnected
    ? { onLongPress: () => onLongPress(user), delayLongPress: 350 }
    : {};

  return (
    <AnimatedListItem key={user.id} index={index} delay={80}>
      <Pressable style={styles.discoverCard} {...pressableProps}>
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
                />
              }
            />
            <View style={styles.discoverOnlineIndicator} />
          </View>
          <View style={styles.discoverNameSection}>
            <View style={styles.discoverHeader}>
              <Text style={styles.discoverName}>
                {String(user.name || "")}
              </Text>
            </View>
            <Text style={styles.discoverUsername}>
              {String(user.username || "")}
            </Text>
            <Text style={styles.discoverLocation}>
              {String(user.location || "")}
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
              {String(user.lastActive || "")}
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
              disabled={discoverLoading || (isPending && isCancelling)}
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
      </Pressable>
    </AnimatedListItem>
  );
}
