/**
 * Compact mix share card inside a chat message (metadata.mix).
 */

import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function SharedMixMessageCard({ mix, isOwn = false, onPress }) {
  if (!mix) return null;

  const thumb =
    (typeof mix.artwork_url === "string" && mix.artwork_url.trim()) ||
    (typeof mix.image_url === "string" && mix.image_url.trim()) ||
    (typeof mix.image === "string" && mix.image.trim()) ||
    null;

  return (
    <TouchableOpacity
      style={[styles.card, isOwn ? styles.ownCard : styles.otherCard]}
      onPress={() => onPress?.(mix)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <View style={styles.artworkWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Ionicons
                name="musical-notes"
                size={28}
                color={isOwn ? "hsl(0, 0%, 35%)" : "hsl(75, 100%, 45%)"}
              />
            </View>
          )}
        </View>
        <View style={styles.textCol}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="headset"
                size={18}
                color={isOwn ? "hsl(0, 0%, 0%)" : "hsl(75, 100%, 60%)"}
              />
            </View>
            <Text
              style={[styles.title, isOwn ? styles.ownTitle : styles.otherTitle]}
              numberOfLines={2}
            >
              {mix.title || "Mix"}
            </Text>
          </View>
          <Text
            style={[styles.artist, isOwn ? styles.ownArtist : styles.otherArtist]}
            numberOfLines={1}
          >
            {mix.artist || "Unknown Artist"}
          </Text>
        </View>
      </View>
      <View style={[styles.footer, isOwn ? styles.footerOwn : styles.footerOther]}>
        <View style={styles.footerContent}>
          <Text
            style={[
              styles.footerText,
              isOwn ? styles.ownFooterText : styles.otherFooterText,
            ]}
          >
            Tap to play
          </Text>
          <Ionicons
            name="play-circle"
            size={20}
            color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(75, 100%, 60%)"}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(SharedMixMessageCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 4,
    minWidth: 240,
    maxWidth: 300,
  },
  ownCard: {
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.2)",
  },
  otherCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 30%)",
  },
  row: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  artworkWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(75, 255, 150, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    lineHeight: 19,
  },
  ownTitle: {
    color: "hsl(0, 0%, 0%)",
  },
  otherTitle: {
    color: "hsl(75, 100%, 60%)",
  },
  artist: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    marginLeft: 36,
  },
  ownArtist: {
    color: "hsl(0, 0%, 35%)",
  },
  otherArtist: {
    color: "hsl(0, 0%, 75%)",
  },
  footerOwn: {
    borderTopColor: "rgba(0, 0, 0, 0.15)",
  },
  footerOther: {
    borderTopColor: "hsl(75, 100%, 20%)",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  ownFooterText: {
    color: "hsl(0, 0%, 40%)",
  },
  otherFooterText: {
    color: "hsl(75, 100%, 60%)",
  },
});
