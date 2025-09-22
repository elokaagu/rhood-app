import React, { useRef, useState } from "react";
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
}) {
  const [showActions, setShowActions] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTopCard,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isTopCard && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: () => {
        if (isTopCard) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowActions(true);
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
          const rotation = gestureState.dx / screenWidth * 0.3;
          rotate.setValue(rotation);
          
          // Add scale effect
          const scaleValue = 1 - Math.abs(gestureState.dx) / screenWidth * 0.1;
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
            ]).start(() => {
              onSwipeLeft && onSwipeLeft();
            });
          } else if (shouldSwipeRight) {
            // Swipe right (like/apply)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            ]).start(() => {
              onSwipeRight && onSwipeRight();
            });
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
          
          setShowActions(false);
        }
      },
    })
  ).current;

  const handleLike = () => {
    if (isTopCard) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      ]).start(() => {
        onSwipeRight && onSwipeRight();
      });
    }
  };

  const handlePass = () => {
    if (isTopCard) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      ]).start(() => {
        onSwipeLeft && onSwipeLeft();
      });
    }
  };

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { scale: scale },
            { rotate: rotateInterpolate },
          ],
          opacity: opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: opportunity.image }} style={styles.featuredImage} />
        
        {/* Image overlay with content */}
        <View style={styles.imageOverlay}>
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
            {opportunity.applicationsLeft} applications left
          </Text>
        </View>

        {/* Swipe indicators */}
        <Animated.View style={[styles.swipeIndicator, styles.likeIndicator, { opacity: likeOpacity }]}>
          <Ionicons name="heart" size={60} color="#4CAF50" />
          <Text style={styles.swipeText}>LIKE</Text>
        </Animated.View>
        
        <Animated.View style={[styles.swipeIndicator, styles.passIndicator, { opacity: passOpacity }]}>
          <Ionicons name="close" size={60} color="#F44336" />
          <Text style={styles.swipeText}>PASS</Text>
        </Animated.View>
      </View>

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.passButton} onPress={handlePass}>
            <Ionicons name="close" size={24} color="#F44336" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
            <Ionicons name="heart" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      )}
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
  swipeIndicator: {
    position: "absolute",
    top: "50%",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateY: -60 }],
  },
  likeIndicator: {
    right: 20,
    borderWidth: 3,
    borderColor: "#4CAF50",
  },
  passIndicator: {
    left: 20,
    borderWidth: 3,
    borderColor: "#F44336",
  },
  swipeText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    marginTop: 4,
  },
  actionButtons: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F44336",
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
});
