import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import RhoodModal from "./RhoodModal";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Mock gigs data
const mockGigs = [
  {
    id: 1,
    name: "Club Neon Resident DJ",
    date: "Jul 1, 2024",
    time: "22:00",
    location: "Miami, FL",
    fee: "£200",
    description:
      "Weekly resident DJ position at Club Neon. House music focus with a vibrant crowd.",
    genre: "House",
    skillLevel: "Beginner",
    organizer: "Club Neon",
    heroImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
  },
  {
    id: 2,
    name: "Berlin Underground Festival",
    date: "Aug 20, 2024",
    time: "20:00",
    location: "Berlin, Germany",
    fee: "£500",
    description:
      "Summer festival lineup. Electronic music showcase with international artists.",
    genre: "Electronic",
    skillLevel: "Advanced",
    organizer: "Berlin Underground",
    heroImage:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop",
  },
  {
    id: 3,
    name: "Ibiza Beach Party",
    date: "Sep 10, 2024",
    time: "18:00",
    location: "Ibiza, Spain",
    fee: "£400",
    description:
      "Sunset beach party with world-class sound system. Progressive house and trance focus.",
    genre: "Progressive",
    skillLevel: "Intermediate",
    organizer: "Ibiza Events",
    heroImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
  },
  {
    id: 4,
    name: "NYC Rooftop Sessions",
    date: "Jul 25, 2024",
    time: "19:00",
    location: "New York, NY",
    fee: "£250",
    description:
      "Intimate rooftop DJ sessions in Manhattan. Deep house and minimal techno.",
    genre: "Deep House",
    skillLevel: "Intermediate",
    organizer: "NYC Underground",
    heroImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
  },
];

export default function OpportunitiesSwipe({ onApply, onPass }) {
  const [currentGigIndex, setCurrentGigIndex] = useState(0);
  const [appliesLeft, setAppliesLeft] = useState(3);
  const [showApplication, setShowApplication] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Custom modal states
  const [showNoApplicationsModal, setShowNoApplicationsModal] = useState(false);

  // Fixed tab bar height for proper positioning (since we're not in a Bottom Tab Navigator)

  // Create new animated values for each card to avoid conflicts
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.9)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.8)).current;

  const currentGig = mockGigs[currentGigIndex];
  const nextGig = mockGigs[(currentGigIndex + 1) % mockGigs.length];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating,
    onMoveShouldSetPanResponder: () => !isAnimating,
    onPanResponderGrant: () => {
      // Reset values when starting drag
      translateX.setOffset(translateX._value);
      translateY.setOffset(translateY._value);
      translateX.setValue(0);
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isAnimating) return;

      const { dx, dy } = gestureState;
      translateX.setValue(dx);
      translateY.setValue(dy * 0.15); // Reduce vertical movement further

      // Calculate opacity based on horizontal movement (smoother curve)
      const opacityValue = 1 - Math.abs(dx) * 0.0008;
      opacity.setValue(Math.max(0.4, opacityValue));

      // Animate next card (smoother scaling)
      const scaleValue = 0.9 + Math.abs(dx) * 0.00015;
      const nextOpacityValue = 0.8 + Math.abs(dx) * 0.0003;
      nextCardScale.setValue(Math.min(1, scaleValue));
      nextCardOpacity.setValue(Math.min(1, nextOpacityValue));
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (isAnimating) return;

      translateX.flattenOffset();
      translateY.flattenOffset();

      const { dx, vx } = gestureState;
      const threshold = 100;

      if (Math.abs(dx) > threshold || Math.abs(vx) > 0.5) {
        if (dx > 0) {
          handleSwipeRight();
        } else {
          handleSwipeLeft();
        }
      } else {
        // Snap back
        snapBack();
      }
    },
  });

  const snapBack = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(nextCardScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(nextCardOpacity, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
    ]).start(() => {
      // Small delay to prevent animation conflicts
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    });
  };

  const handleSwipeLeft = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset values and move to next gig
      translateX.setValue(0);
      translateY.setValue(0);
      opacity.setValue(1);
      nextCardScale.setValue(0.9);
      nextCardOpacity.setValue(0.8);

      setCurrentGigIndex((prevIndex) =>
        prevIndex === mockGigs.length - 1 ? 0 : prevIndex + 1
      );
      
      // Small delay to prevent animation conflicts
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
      
      onPass && onPass(currentGig);
    });
  };

  const handleSwipeRight = () => {
    if (isAnimating) return;
    
    if (appliesLeft > 0) {
      setIsAnimating(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset values
        translateX.setValue(0);
        translateY.setValue(0);
        opacity.setValue(1);
        nextCardScale.setValue(0.9);
        nextCardOpacity.setValue(0.8);

        setCurrentGigIndex((prevIndex) =>
          prevIndex === mockGigs.length - 1 ? 0 : prevIndex + 1
        );
        setAppliesLeft(appliesLeft - 1);
        
        // Small delay to prevent animation conflicts
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
        
        setShowApplication(true);
      });
    } else {
      setShowNoApplicationsModal(true);
    }
  };

  const handleApplyConfirm = () => {
    setAppliesLeft((prev) => prev - 1);
    setShowApplication(false);
    setCurrentGigIndex((prevIndex) =>
      prevIndex === mockGigs.length - 1 ? 0 : prevIndex + 1
    );
    onApply && onApply(currentGig);
  };

  const handleApplyCancel = () => {
    setShowApplication(false);
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case "Beginner":
        return "hsl(120, 100%, 50%)";
      case "Intermediate":
        return "hsl(45, 100%, 50%)";
      case "Advanced":
        return "hsl(0, 100%, 50%)";
      default:
        return "hsl(0, 0%, 70%)";
    }
  };

  if (showApplication) {
    return (
      <View style={styles.applicationModal}>
        <View style={styles.applicationCard}>
          <Text style={styles.applicationTitle}>Apply for this gig?</Text>
          <Text style={styles.applicationGigName}>{currentGig.name}</Text>
          <Text style={styles.applicationDetails}>
            {currentGig.date} at {currentGig.time} • {currentGig.location}
          </Text>
          <Text style={styles.applicationFee}>{currentGig.fee}</Text>

          <View style={styles.applicationButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleApplyCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleApplyConfirm}
            >
              <Text style={styles.confirmButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Opportunities</Text>
        <Text style={styles.appliesLeft}>Applications left: {appliesLeft}</Text>
      </View>

      {/* Card Stack Container */}
      <View style={styles.cardContainer}>
        {/* Next Card (underneath) */}
        <Animated.View
          style={[
            styles.card,
            styles.nextCard,
            {
              transform: [{ scale: nextCardScale }, { translateY: 10 }],
              opacity: nextCardOpacity,
            },
          ]}
        >
          <ImageBackground
            source={{ uri: nextGig.heroImage }}
            style={styles.cardImageBackground}
            resizeMode="cover"
          >
            <View style={styles.cardOverlay} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
              locations={[0, 0.5, 1]}
              style={styles.cardGradientOverlay}
            />
            {/* Genre Badge */}
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{nextGig.genre}</Text>
            </View>

            {/* Card Content */}
            <View style={styles.nextCardContent}>
              <Text style={styles.nextCardTitle}>{nextGig.name}</Text>
              <Text style={styles.nextCardDescription}>
                {nextGig.description}
              </Text>

              {/* Event Details */}
              <View style={styles.nextCardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>
                    {nextGig.date} at {nextGig.time}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>{nextGig.location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>{nextGig.fee}</Text>
                </View>
              </View>

              <View style={styles.nextCardFooter}>
                <View style={styles.skillLevelContainer}>
                  <Text
                    style={[
                      styles.skillLevelText,
                      { color: getSkillLevelColor(nextGig.skillLevel) },
                    ]}
                  >
                    {nextGig.skillLevel}
                  </Text>
                </View>
                <Text style={styles.organizerName}>{nextGig.organizer}</Text>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* Current Card (draggable) */}
        <Animated.View
          style={[
            styles.card,
            styles.currentCard,
            {
              transform: [{ translateX }, { translateY }],
              opacity,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <ImageBackground
            source={{ uri: currentGig.heroImage }}
            style={styles.cardImageBackground}
            resizeMode="cover"
          >
            <View style={styles.cardOverlay} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
              locations={[0, 0.5, 1]}
              style={styles.cardGradientOverlay}
            />
            {/* Swipe indicators */}
            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.applyIndicator,
                {
                  opacity: translateX.interpolate({
                    inputRange: [50, 100],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  }),
                  transform: [{ rotate: "12deg" }],
                },
              ]}
            >
              <Text style={styles.swipeIndicatorText}>APPLY</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.passIndicator,
                {
                  opacity: translateX.interpolate({
                    inputRange: [-100, -50],
                    outputRange: [1, 0],
                    extrapolate: "clamp",
                  }),
                  transform: [{ rotate: "-12deg" }],
                },
              ]}
            >
              <Text style={styles.swipeIndicatorText}>PASS</Text>
            </Animated.View>

            {/* Dark overlay for text readability */}
            <View style={styles.cardOverlay} />

            {/* Genre badge */}
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{currentGig.genre}</Text>
            </View>

            {/* Content overlay */}
            <View style={styles.cardContent}>
              <Text style={styles.gigTitle}>{currentGig.name}</Text>
              <Text style={styles.gigDescription}>
                {currentGig.description}
              </Text>

              <View style={styles.gigDetails}>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>
                    {currentGig.date} at {currentGig.time}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>{currentGig.location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.detailText}>{currentGig.fee}</Text>
                </View>
              </View>

              <View style={styles.gigFooter}>
                <View style={styles.skillLevelContainer}>
                  <Text
                    style={[
                      styles.skillLevelText,
                      { color: getSkillLevelColor(currentGig.skillLevel) },
                    ]}
                  >
                    {currentGig.skillLevel}
                  </Text>
                </View>
                <Text style={styles.organizerName}>{currentGig.organizer}</Text>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      </View>

      {/* Custom Modals */}
      <RhoodModal
        visible={showNoApplicationsModal}
        onClose={() => setShowNoApplicationsModal(false)}
        title="No Applications Left"
        message="You have used all your applications for today. Check back tomorrow!"
        type="warning"
        primaryButtonText="OK"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  appliesLeft: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    position: "absolute",
    width: screenWidth - 40,
    height: 500, // Restore full height since we have proper spacing now
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    opacity: 1,
  },
  currentCard: {
    zIndex: 100,
  },
  nextCard: {
    zIndex: 10,
  },
  cardImageBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  cardGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  genreBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  genreText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  gigTitle: {
    fontSize: 28,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gigDescription: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    lineHeight: 22,
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gigDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gigFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillLevelContainer: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillLevelText: {
    fontSize: 10,
    fontFamily: "Arial",
    fontWeight: "600",
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nextCardContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  nextCardTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nextCardDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    lineHeight: 20,
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nextCardDetails: {
    marginBottom: 16,
  },
  nextCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  swipeIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -20,
    marginLeft: -50,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 30,
  },
  applyIndicator: {
    backgroundColor: "hsla(120, 100%, 50%, 0.9)",
  },
  passIndicator: {
    backgroundColor: "hsla(0, 100%, 50%, 0.9)",
  },
  swipeIndicatorText: {
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  applicationModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  applicationCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    alignItems: "center",
  },
  applicationTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  applicationGigName: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
    textAlign: "center",
  },
  applicationDetails: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
    textAlign: "center",
  },
  applicationFee: {
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 24,
  },
  applicationButtons: {
    flexDirection: "row",
    gap: 16,
  },
  cancelButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  confirmButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
});
