import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const SHIMMER_DURATION_MS = 1300;

/**
 * Base skeleton: dark track + horizontal shimmer sweep (not a simple opacity pulse).
 * Layout is measured via onLayout so percentage widths/heights work.
 */
export default function Skeleton({ width, height, borderRadius = 8, style }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [track, setTrack] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    setTrack((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  const bandW = useMemo(() => {
    if (track.w <= 0) return 64;
    return Math.min(140, Math.max(56, track.w * 0.5));
  }, [track.w]);

  useEffect(() => {
    if (track.w <= 0) return;

    const start = -bandW;
    const end = track.w + bandW;
    translateX.setValue(start);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: end,
          duration: SHIMMER_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: start,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [track.w, bandW, translateX]);

  return (
    <View
      style={[
        styles.track,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
      onLayout={onLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerBand,
          {
            width: bandW,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255, 255, 255, 0.05)",
            "rgba(194, 204, 6, 0.22)",
            "rgba(255, 255, 255, 0.07)",
            "transparent",
          ]}
          locations={[0, 0.28, 0.5, 0.72, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// --- App-specific preset layouts (R/HOOD dark theme) ---

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton
        width="100%"
        height={200}
        borderRadius={12}
        style={styles.cardImage}
      />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={20} style={styles.cardTitle} />
        <Skeleton width="50%" height={16} style={styles.cardSubtitle} />
        <Skeleton width="40%" height={14} style={styles.cardMeta} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonListItem key={`skeleton-list-item-${index}`} />
      ))}
    </>
  );
}

export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <Skeleton
        width={60}
        height={60}
        borderRadius={30}
        style={styles.avatar}
      />
      <View style={styles.listItemContent}>
        <Skeleton width="80%" height={18} style={styles.listItemTitle} />
        <Skeleton width="60%" height={14} style={styles.listItemSubtitle} />
      </View>
    </View>
  );
}

export function SkeletonProfile() {
  return (
    <View style={styles.profile}>
      <Skeleton
        width={120}
        height={120}
        borderRadius={60}
        style={styles.profileAvatar}
      />
      <Skeleton width={180} height={24} style={styles.profileName} />
      <Skeleton width={140} height={16} style={styles.profileBio} />
      <View style={styles.profileStats}>
        <Skeleton width={80} height={40} borderRadius={8} />
        <Skeleton width={80} height={40} borderRadius={8} />
        <Skeleton width={80} height={40} borderRadius={8} />
      </View>
    </View>
  );
}

/** Matches ~SwipeableOpportunityCard card height (400). */
export function SkeletonOpportunity() {
  return (
    <View style={styles.opportunity}>
      <Skeleton
        width="100%"
        height={400}
        borderRadius={16}
        style={styles.opportunityImage}
      />
      <View style={styles.opportunityOverlay}>
        <Skeleton width="60%" height={20} style={styles.opportunityTitle} />
        <Skeleton width="80%" height={28} style={styles.opportunityHeading} />
        <Skeleton width="40%" height={16} style={styles.opportunityMeta} />
      </View>
    </View>
  );
}

export function SkeletonMix() {
  return (
    <View style={styles.mix}>
      <Skeleton
        width={80}
        height={80}
        borderRadius={8}
        style={styles.mixArtwork}
      />
      <View style={styles.mixContent}>
        <Skeleton width="70%" height={18} style={styles.mixTitle} />
        <Skeleton width="50%" height={14} style={styles.mixArtist} />
        <Skeleton width="30%" height={12} style={styles.mixDuration} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>
  );
}

export function SkeletonMessage({ align = "left" }) {
  const isRight = align === "right";
  return (
    <View style={[styles.message, isRight && styles.messageRight]}>
      <View
        style={[styles.messageBubble, isRight && styles.messageBubbleRight]}
      >
        <Skeleton
          width={isRight ? 180 : 200}
          height={60}
          borderRadius={20}
          style={styles.messageSkeleton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  shimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },

  // Card Skeleton
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  cardImage: {
    marginBottom: 0,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardSubtitle: {
    marginBottom: 8,
  },
  cardMeta: {
    marginBottom: 0,
  },

  // List Item Skeleton
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  avatar: {
    marginRight: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    marginBottom: 8,
  },
  listItemSubtitle: {
    marginBottom: 0,
  },

  // Profile Skeleton
  profile: {
    alignItems: "center",
    padding: 24,
  },
  profileAvatar: {
    marginBottom: 16,
  },
  profileName: {
    marginBottom: 8,
  },
  profileBio: {
    marginBottom: 24,
  },
  profileStats: {
    flexDirection: "row",
    gap: 12,
  },

  // Opportunity Skeleton (see SwipeableOpportunityCard ~400 height)
  opportunity: {
    position: "relative",
    height: 400,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  opportunityImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  opportunityOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  opportunityTitle: {
    marginBottom: 8,
  },
  opportunityHeading: {
    marginBottom: 8,
  },
  opportunityMeta: {
    marginBottom: 0,
  },

  // Mix Skeleton
  mix: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  mixArtwork: {
    marginRight: 16,
  },
  mixContent: {
    flex: 1,
  },
  mixTitle: {
    marginBottom: 8,
  },
  mixArtist: {
    marginBottom: 6,
  },
  mixDuration: {
    marginBottom: 0,
  },

  // Message Skeleton
  message: {
    marginBottom: 16,
    alignItems: "flex-start",
  },
  messageRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
  },
  messageBubbleRight: {
    alignItems: "flex-end",
  },
  messageSkeleton: {
    marginBottom: 0,
  },
});
