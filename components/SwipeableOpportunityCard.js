import React, { useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import ProgressiveImage from "./ProgressiveImage";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.25;
const SWIPE_OUT_DURATION = 250;
/** Damp vertical drag so the card stays mostly horizontal */
const VERTICAL_DRAG_SCALE = 0.15;
const TAP_MAX_MOVEMENT = 12;
const TAP_MAX_DURATION_MS = 280;

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
  const grantTimeRef = useRef(0);

  useEffect(() => {
    if (__DEV__ && isTopCard) {
      console.log(
        "🎯 SwipeableOpportunityCard - dailyApplicationStats:",
        dailyApplicationStats
      );
    }
  }, [isTopCard, dailyApplicationStats]);

  const animateSwipeOut = useCallback(
    (direction, endY = 0) => {
      const x =
        direction === "right" ? screenWidth * 1.5 : -screenWidth * 1.5;

      Animated.parallel([
        Animated.timing(position, {
          toValue: { x, y: endY },
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
      ]).start(({ finished }) => {
        if (!finished) return;
        if (direction === "left") onSwipeLeft?.();
        else onSwipeRight?.();
      });
    },
    [position, opacity, fadeOverlay, onSwipeLeft, onSwipeRight]
  );

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
            grantTimeRef.current = Date.now();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // ValueXY has no public "current value" getter; offset must be set synchronously on grant.
            position.setOffset({
              x: position.x._value,
              y: position.y._value,
            });
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (isTopCard) {
            position.setValue({
              x: gestureState.dx,
              y: gestureState.dy * VERTICAL_DRAG_SCALE,
            });

            const rotation = (gestureState.dx / screenWidth) * 0.3;
            rotate.setValue(rotation);

            const scaleValue =
              1 - (Math.abs(gestureState.dx) / screenWidth) * 0.1;
            scale.setValue(Math.max(0.9, scaleValue));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isTopCard) {
            position.flattenOffset();

            const { dx, dy, vx } = gestureState;
            const shouldSwipeLeft = dx < -SWIPE_THRESHOLD || vx < -0.5;
            const shouldSwipeRight = dx > SWIPE_THRESHOLD || vx > 0.5;

            if (shouldSwipeLeft) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              animateSwipeOut("left", dx * 0.5 * VERTICAL_DRAG_SCALE);
            } else if (shouldSwipeRight) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              animateSwipeOut("right", dx * 0.5 * VERTICAL_DRAG_SCALE);
            } else {
              const elapsed = Date.now() - grantTimeRef.current;
              const isTap =
                Math.abs(dx) < TAP_MAX_MOVEMENT &&
                Math.abs(dy) < TAP_MAX_MOVEMENT &&
                elapsed < TAP_MAX_DURATION_MS &&
                Math.abs(vx) < 0.15;

              if (isTap && onPress) {
                onPress();
              }

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
    [isTopCard, animateSwipeOut, onPress]
  );

  useEffect(() => {
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
  }, [opportunity.id, isTopCard]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const imageUri =
    opportunity?.image ||
    opportunity?.image_url ||
    opportunity?.cover_image_url ||
    null;

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
      <View style={styles.cardShadow}>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <ProgressiveImage
              source={{ uri: imageUri }}
              style={styles.progressiveImageWrap}
              imageStyle={styles.featuredImage}
              contentFit="cover"
              transition={420}
            />
          ) : (
            <Image
              source={require("../assets/rhood_logo.webp")}
              style={styles.featuredImage}
              resizeMode="contain"
            />
          )}

          <LinearGradient
            colors={[
              "transparent",
              "rgba(0, 0, 0, 0.3)",
              "rgba(0, 0, 0, 0.8)",
            ]}
            locations={[0, 0.6, 1]}
            style={styles.gradientOverlay}
          >
            <View style={styles.overlayContent}>
              <View style={styles.overlayHeader}>
                <View style={styles.overlayHeaderSpacer} />
                <View style={styles.overlayHeaderBadges}>
                  {opportunity.status === "hot" && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>HOT</Text>
                    </View>
                  )}
                  {opportunity.status === "closing" && (
                    <View style={[styles.statusBadge, styles.closingBadge]}>
                      <Text style={styles.statusBadgeText}>CLOSING</Text>
                    </View>
                  )}
                </View>
              </View>
              {opportunity.status === "new" && (
                <View style={styles.newBadgeContainer}>
                  <View style={[styles.statusBadge, styles.newBadge]}>
                    <Text style={styles.statusBadgeText}>NEW</Text>
                  </View>
                </View>
              )}
              <Text style={styles.eventTitle}>{opportunity.title}</Text>
              <Text style={styles.applicationsLeft}>
                {dailyApplicationStats &&
                dailyApplicationStats.remaining_applications !== undefined
                  ? `${dailyApplicationStats.remaining_applications} applications remaining today`
                  : "Loading..."}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <Animated.View
          style={[
            styles.fadeOverlay,
            {
              opacity: fadeOverlay,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 0,
    marginVertical: 0,
    overflow: "hidden",
    height: 400,
    width: "100%",
  },
  cardShadow: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    flex: 1,
    backgroundColor: "hsl(0, 0%, 10%)",
    overflow: "hidden",
  },
  /** Fills the image area so ProgressiveImage placeholder + fade have a bounded box */
  progressiveImageWrap: {
    ...StyleSheet.absoluteFillObject,
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
  overlayHeaderSpacer: {
    flex: 1,
  },
  overlayHeaderBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    color: "hsl(0, 0%, 0%)",
    fontWeight: "700",
  },
  newBadgeContainer: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
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
