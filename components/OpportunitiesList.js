import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { db } from "../lib/supabase";
import { RH } from "../src/design/tokens";

export default function OpportunitiesList({ onApply, onPass }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedOpportunities, setAppliedOpportunities] = useState(new Set());

  // Calculate bottom padding for floating tab bar
  const tabBarHeight = useBottomTabBarHeight();
  const padBottom = tabBarHeight + RH.space.xl; // extra breathing room

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const data = await db.getOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error("Error loading opportunities:", error);
      Alert.alert(
        "Error",
        "Failed to load opportunities. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOpportunities();
    setRefreshing(false);
  };

  const handleApply = async (opportunity) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please complete your profile first.");
        return;
      }

      // Check if already applied
      if (appliedOpportunities.has(opportunity.id)) {
        Alert.alert(
          "Already Applied",
          "You have already applied to this opportunity."
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        "Apply for Opportunity",
        `Are you sure you want to apply for "${opportunity.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Apply",
            onPress: async () => {
              try {
                await db.applyToOpportunity(opportunity.id, userId);
                setAppliedOpportunities(
                  (prev) => new Set([...prev, opportunity.id])
                );
                Alert.alert("Success", "Application submitted successfully!");
                onApply && onApply(opportunity);
              } catch (error) {
                console.error("Error applying:", error);
                Alert.alert(
                  "Error",
                  "Failed to submit application. Please try again."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in handleApply:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handlePass = (opportunity) => {
    Alert.alert(
      "Pass on Opportunity",
      `Are you sure you want to pass on "${opportunity.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pass",
          onPress: () => {
            onPass && onPass(opportunity);
            // You could add logic here to track passed opportunities
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case "beginner":
        return "hsl(120, 100%, 50%)"; // Green
      case "intermediate":
        return "hsl(45, 100%, 50%)"; // Yellow
      case "advanced":
        return "hsl(0, 100%, 50%)"; // Red
      default:
        return "hsl(0, 0%, 70%)"; // Gray
    }
  };

  const renderOpportunityCard = (opportunity) => (
    <View key={opportunity.id} style={styles.opportunityCard}>
      {/* Header with genre and applications remaining */}
      <View style={styles.cardHeader}>
        <View style={styles.genreContainer}>
          <Text style={styles.genreText}>{opportunity.genre}</Text>
        </View>
        <View style={styles.skillLevelContainer}>
          <Text
            style={[
              styles.skillLevelText,
              { color: getSkillLevelColor(opportunity.skill_level) },
            ]}
          >
            {opportunity.skill_level?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Title and description */}
      <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
      <Text style={styles.opportunityDescription}>
        {opportunity.description}
      </Text>

      {/* Event details */}
      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.detailText}>
            {formatDate(opportunity.event_date)} at{" "}
            {formatTime(opportunity.event_date)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.detailText}>{opportunity.location}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>£{opportunity.payment}</Text>
        </View>
      </View>

      {/* Organizer info */}
      <View style={styles.organizerInfo}>
        <Text style={styles.organizerLabel}>Organized by:</Text>
        <Text style={styles.organizerName}>{opportunity.organizer_name}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.passButton}
          onPress={() => handlePass(opportunity)}
        >
          <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
          <Text style={styles.buttonText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.applyButton,
            appliedOpportunities.has(opportunity.id) && styles.appliedButton,
          ]}
          onPress={() => handleApply(opportunity)}
        >
          <Ionicons
            name={
              appliedOpportunities.has(opportunity.id) ? "checkmark" : "heart"
            }
            size={20}
            color="hsl(0, 0%, 0%)"
          />
          <Text style={styles.buttonText}>
            {appliedOpportunities.has(opportunity.id) ? "Applied" : "Apply"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </View>
    );
  }

  if (opportunities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="musical-notes-outline"
          size={64}
          color="hsl(0, 0%, 30%)"
        />
        <Text style={styles.emptyTitle}>No Opportunities Available</Text>
        <Text style={styles.emptySubtitle}>Check back later for new gigs!</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadOpportunities}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: padBottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Opportunities</Text>
        <Text style={styles.headerSubtitle}>
          {opportunities.length} gigs available
        </Text>
      </View>

      {opportunities.map(renderOpportunityCard)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  opportunityCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  genreContainer: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
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
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 20,
    marginBottom: 16,
  },
  eventDetails: {
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
  },
  organizerInfo: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  organizerLabel: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 4,
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  passButton: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  appliedButton: {
    backgroundColor: "hsl(120, 100%, 50%)",
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
});
