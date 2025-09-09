import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  PanGestureHandler,
  Dimensions,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LinearGradient from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Mock data for opportunities
const mockGigs = [
  {
    id: "1",
    name: "Underground Warehouse Rave",
    date: "2024-08-15",
    time: "22:00",
    location: "East London",
    fee: "£300",
    description:
      "High-energy underground event. Looking for DJs who can bring the heat with hard techno and industrial beats.",
    genre: ["Techno", "Industrial"],
    heroImage:
      "https://images.unsplash.com/photo-1571266028243-4c8c8b0b8b0b?w=800&h=600&fit=crop",
    applicationsRemaining: 12,
  },
  {
    id: "2",
    name: "Club Neon Resident DJ",
    date: "2024-07-01",
    time: "22:00",
    location: "Miami, FL",
    fee: "£200",
    description:
      "Weekly resident DJ position at Club Neon. House music focus with a vibrant crowd.",
    genre: ["House", "Deep House"],
    heroImage:
      "https://images.unsplash.com/photo-1571266028243-4c8c8b0b8b0b?w=800&h=600&fit=crop",
    applicationsRemaining: 8,
  },
  {
    id: "3",
    name: "Berlin Underground Festival",
    date: "2024-08-20",
    time: "20:00",
    location: "Berlin, Germany",
    fee: "£500",
    description:
      "Summer festival lineup. Electronic music showcase with international artists.",
    genre: ["Electronic", "Techno", "Ambient"],
    heroImage:
      "https://images.unsplash.com/photo-1571266028243-4c8c8b0b8b0b?w=800&h=600&fit=crop",
    applicationsRemaining: 5,
  },
  {
    id: "4",
    name: "Ibiza Beach Party",
    date: "2024-09-10",
    time: "18:00",
    location: "Ibiza, Spain",
    fee: "£400",
    description:
      "Sunset beach party with world-class sound system. Progressive house and trance focus.",
    genre: ["Progressive", "Trance", "House"],
    heroImage:
      "https://images.unsplash.com/photo-1571266028243-4c8c8b0b8b0b?w=800&h=600&fit=crop",
    applicationsRemaining: 15,
  },
];

export default function OpportunitiesSwipe({ onApply, onPass }) {
  const [currentGigIndex, setCurrentGigIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [applicationsRemaining, setApplicationsRemaining] = useState(40);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentGig = mockGigs[currentGigIndex];

  const handleSwipeLeft = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      nextGig();
      onPass && onPass(currentGig);
    });
  };

  const handleSwipeRight = () => {
    setShowConfirmDialog(true);
  };

  const confirmApply = () => {
    setShowConfirmDialog(false);
    setApplicationsRemaining((prev) => prev - 1);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      nextGig();
      onApply && onApply(currentGig);
    });
  };

  const nextGig = () => {
    const nextIndex = (currentGigIndex + 1) % mockGigs.length;
    setCurrentGigIndex(nextIndex);
    translateX.setValue(0);
    opacity.setValue(1);
  };

  const renderGenreTags = () => (
    <View style={styles.genreContainer}>
      {currentGig.genre.map((genre, index) => (
        <View key={index} style={styles.genreTag}>
          <Text style={styles.genreTagText}>{genre}</Text>
        </View>
      ))}
    </View>
  );

  const renderOpportunityCard = () => (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      <Image source={{ uri: currentGig.heroImage }} style={styles.heroImage} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradientOverlay}
      />

      {/* Applications Remaining Counter */}
      <View style={styles.applicationsCounter}>
        <Ionicons name="people-outline" size={16} color="hsl(75, 100%, 60%)" />
        <Text style={styles.applicationsText}>
          {currentGig.applicationsRemaining} left
        </Text>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.gigTitle}>{currentGig.name}</Text>

        <View style={styles.dateLocationRow}>
          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color="hsl(0, 0%, 100%)"
            />
            <Text style={styles.dateText}>
              {currentGig.date} at {currentGig.time}
            </Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <Ionicons
            name="location-outline"
            size={16}
            color="hsl(0, 0%, 100%)"
          />
          <Text style={styles.locationText}>{currentGig.location}</Text>
        </View>

        <View style={styles.feeContainer}>
          <Text style={styles.feeText}>{currentGig.fee}</Text>
        </View>

        {renderGenreTags()}

        <Text style={styles.descriptionText}>{currentGig.description}</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>R/HOOD</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="people-outline"
              size={24}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="person-outline"
              size={24}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="settings-outline"
              size={24}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Card Area */}
      <View style={styles.cardContainer}>{renderOpportunityCard()}</View>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.passButton} onPress={handleSwipeLeft}>
          <Ionicons name="close" size={32} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>

        <View style={styles.remainingContainer}>
          <Text style={styles.remainingText}>
            {applicationsRemaining} applications remaining
          </Text>
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={handleSwipeRight}>
          <Ionicons name="heart" size={32} color="hsl(0, 0%, 0%)" />
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for this gig?</Text>
            <Text style={styles.modalSubtitle}>{currentGig.name}</Text>
            <Text style={styles.modalDescription}>
              You're about to apply for this opportunity. This will use one of
              your remaining applications.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmApply}
              >
                <Text style={styles.modalConfirmText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerLeft: {
    flex: 1,
  },
  logoText: {
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)", // R/HOOD lime
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 10%)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 5%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  heroImage: {
    width: "100%",
    height: "60%",
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  applicationsCounter: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  applicationsText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    marginLeft: 4,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  gigTitle: {
    fontSize: 28,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 12,
  },
  dateLocationRow: {
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 8,
  },
  feeContainer: {
    marginBottom: 12,
  },
  feeText: {
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)",
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 25%)",
  },
  applyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  remainingContainer: {
    flex: 1,
    alignItems: "center",
  },
  remainingText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    textAlign: "center",
  },
});
