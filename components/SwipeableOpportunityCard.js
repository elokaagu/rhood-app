import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.25;
const SWIPE_OUT_DURATION = 250;

export default function SwipeableOpportunityCard({
  opportunity,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTopCard = false,
  isNextCard = false,
  dailyApplicationStats = null,
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(isNextCard ? 0.95 : 1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(isNextCard ? 0.8 : 1)).current;
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(30)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isTopCard,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            isTopCard &&
            (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5)
          );
        },
        onPanResponderGrant: () => {
          if (isTopCard) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            position.setOffset({
              x: position.x._value,
              y: position.y._value,
            });
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (isTopCard) {
            position.setValue({ x: gestureState.dx, y: gestureState.dy });

            // Add rotation based on horizontal movement
            const rotation = (gestureState.dx / screenWidth) * 0.3;
            rotate.setValue(rotation);

            // Add scale effect
            const scaleValue =
              1 - (Math.abs(gestureState.dx) / screenWidth) * 0.1;
            scale.setValue(Math.max(0.9, scaleValue));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isTopCard) {
            position.flattenOffset();

            const { dx, vx } = gestureState;
            const shouldSwipeLeft = dx < -SWIPE_THRESHOLD || vx < -0.5;
            const shouldSwipeRight = dx > SWIPE_THRESHOLD || vx > 0.5;

            if (shouldSwipeLeft) {
              // Swipe left (pass)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Call swipe handler immediately to show next card
              onSwipeLeft && onSwipeLeft();

              Animated.parallel([
                Animated.timing(position, {
                  toValue: { x: -screenWidth * 1.5, y: dx * 0.5 },
                  duration: SWIPE_OUT_DURATION,
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: SWIPE_OUT_DURATION,
                  useNativeDriver: true,
                }),
                Animated.timing(fadeOverlay, {
                  toValue: 1,
                  duration: SWIPE_OUT_DURATION * 0.7,
                  useNativeDriver: true,
                }),
              ]).start();
            } else if (shouldSwipeRight) {
              // Swipe right (like/apply)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Call swipe handler immediately to show next card
              onSwipeRight && onSwipeRight();

              Animated.parallel([
                Animated.timing(position, {
                  toValue: { x: screenWidth * 1.5, y: dx * 0.5 },
                  duration: SWIPE_OUT_DURATION,
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: SWIPE_OUT_DURATION,
                  useNativeDriver: true,
                }),
                Animated.timing(fadeOverlay, {
                  toValue: 1,
                  duration: SWIPE_OUT_DURATION * 0.7,
                  useNativeDriver: true,
                }),
              ]).start();
            } else {
              // Return to center
              Animated.parallel([
                Animated.spring(position, {
                  toValue: { x: 0, y: 0 },
                  useNativeDriver: true,
                  tension: 100,
                  friction: 8,
                }),
                Animated.spring(scale, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 100,
                  friction: 8,
                }),
                Animated.spring(rotate, {
                  toValue: 0,
                  useNativeDriver: true,
                  tension: 100,
                  friction: 8,
                }),
              ]).start();
            }
          }
        },
      }),
    [isTopCard, onSwipeLeft, onSwipeRight]
  );

  // Entrance animation when card becomes visible
  useEffect(() => {
    // Animate entrance when card first appears or becomes top card
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(entranceTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opportunity.id]); // Re-run when opportunity changes

  const handleLike = () => {
    if (isTopCard) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call swipe handler immediately to show next card
      onSwipeRight && onSwipeRight();

      Animated.parallel([
        Animated.timing(position, {
          toValue: { x: screenWidth * 1.5, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeOverlay, {
          toValue: 1,
          duration: SWIPE_OUT_DURATION * 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePass = () => {
    if (isTopCard) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call swipe handler immediately to show next card
      onSwipeLeft && onSwipeLeft();

      Animated.parallel([
        Animated.timing(position, {
          toValue: { x: -screenWidth * 1.5, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeOverlay, {
          toValue: 1,
          duration: SWIPE_OUT_DURATION * 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { translateY: entranceTranslateY },
            { scale: scale },
            { rotate: rotateInterpolate },
          ],
          opacity: Animated.multiply(opacity, entranceOpacity),
          zIndex: isTopCard ? 10 : 1,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: opportunity.image }}
          style={styles.featuredImage}
        />

        {/* Dark fade gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
          locations={[0, 0.6, 1]}
          style={styles.gradientOverlay}
        >
          <View style={styles.overlayContent}>
            <View style={styles.overlayHeader}>
              <Text style={styles.venueName}>{opportunity.venue}</Text>
              {opportunity.status === "hot" && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>HOT</Text>
                </View>
              )}
              {opportunity.status === "new" && (
                <View style={[styles.statusBadge, styles.newBadge]}>
                  <Text style={styles.statusBadgeText}>NEW</Text>
                </View>
              )}
              {opportunity.status === "closing" && (
                <View style={[styles.statusBadge, styles.closingBadge]}>
                  <Text style={styles.statusBadgeText}>CLOSING</Text>
                </View>
              )}
            </View>
            <Text style={styles.eventTitle}>{opportunity.title}</Text>
            <Text style={styles.applicationsLeft}>
              {dailyApplicationStats ? 
                `${dailyApplicationStats.remaining_applications} applications remaining today` :
                'Loading...'
              }
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Dark fade overlay */}
      <Animated.View
        style={[
          styles.fadeOverlay,
          {
            opacity: fadeOverlay,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
    height: 400, // Fixed height instead of flex: 1
    width: "100%", // Ensure full width
  },
  imageContainer: {
    position: "relative",
    flex: 1,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  overlayContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  overlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  venueName: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    backgroundColor: "hsl(0, 100%, 50%)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadge: {
    backgroundColor: "hsl(120, 100%, 50%)",
  },
  closingBadge: {
    backgroundColor: "hsl(30, 100%, 50%)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    lineHeight: 26,
  },
  applicationsLeft: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginTop: 4,
    fontWeight: "600",
  },
  fadeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
  },
});
