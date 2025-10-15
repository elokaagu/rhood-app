import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { matchmaking } from "../lib/matchmaking";
import { db } from "../lib/supabase";

export default function MatchmakingScreen({ userId, onNavigate }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadMatches();
    loadAnalytics();
  }, [userId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await matchmaking.getMatches(userId);
      setMatches(data);
    } catch (error) {
      console.error("Error loading matches:", error);
      Alert.alert("Error", "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await matchmaking.getMatchmakingAnalytics(userId);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMatches(), loadAnalytics()]);
    setRefreshing(false);
  };

  const handleApply = async (match) => {
    try {
      await matchmaking.applyToOpportunity(userId, match.opportunity_id);

      // Get updated daily stats after successful application
      const stats = await db.getUserDailyApplicationStats(userId);

      Alert.alert(
        "Success",
        `Application submitted successfully! You have ${stats.remaining_applications} applications remaining today.`,
        [{ text: "OK" }]
      );
      loadMatches(); // Refresh matches
    } catch (error) {
      console.error("Error applying:", error);

      // Check if it's a mix requirement error
      if (error.message.includes("upload at least one mix")) {
        Alert.alert("Mix Required", error.message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upload Mix",
            onPress: () => onNavigate && onNavigate("upload-mix"),
          },
        ]);
      } else if (error.message.includes("Daily application limit")) {
        Alert.alert("Daily Limit Reached", error.message);
      } else if (error.message.includes("already applied")) {
        Alert.alert("Already Applied", error.message);
      } else {
        Alert.alert("Error", "Failed to submit application");
      }
    }
  };

  const handlePass = async (match) => {
    try {
      await matchmaking.updateMatchStatus(match.id, "rejected");
      setMatches(matches.filter((m) => m.id !== match.id));
    } catch (error) {
      console.error("Error passing on match:", error);
      Alert.alert("Error", "Failed to update match status");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return "hsl(120, 100%, 50%)"; // Green
    if (score >= 60) return "hsl(60, 100%, 50%)"; // Yellow
    return "hsl(0, 100%, 50%)"; // Red
  };

  const renderMatchCard = (match) => (
    <View key={match.id} style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.matchScoreContainer}>
          <Text
            style={[
              styles.matchScore,
              { color: getMatchScoreColor(match.match_score) },
            ]}
          >
            {Math.round(match.match_score)}%
          </Text>
          <Text style={styles.matchScoreLabel}>Match</Text>
        </View>
        <View style={styles.matchStatus}>
          <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.opportunityInfo}>
        <Text style={styles.opportunityTitle}>{match.opportunity?.title}</Text>
        <Text style={styles.opportunityDescription}>
          {match.opportunity?.description}
        </Text>

        <View style={styles.opportunityDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>
              {formatDate(match.opportunity?.event_date)} at{" "}
              {formatTime(match.opportunity?.event_date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>{match.opportunity?.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="musical-notes-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>{match.opportunity?.genre}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="hsl(0, 0%, 70%)" />
            <Text style={styles.detailText}>${match.opportunity?.payment}</Text>
          </View>
        </View>

        {match.match_reasons && (
          <View style={styles.matchReasons}>
            <Text style={styles.reasonsTitle}>Why this is a good match:</Text>
            {match.match_reasons.map((reason, index) => (
              <Text key={index} style={styles.reasonText}>
                • {reason}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.matchActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handlePass(match)}
        >
          <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
          <Text style={styles.actionButtonText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.applyButton]}
          onPress={() => handleApply(match)}
          disabled={match.status === "applied"}
        >
          <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 0%)" />
          <Text style={[styles.actionButtonText, styles.applyButtonText]}>
            {match.status === "applied" ? "Applied" : "Apply"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Your Matchmaking Stats</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsNumber}>{analytics.totalMatches}</Text>
            <Text style={styles.analyticsLabel}>Total Matches</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsNumber}>
              {analytics.appliedMatches}
            </Text>
            <Text style={styles.analyticsLabel}>Applied</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsNumber}>
              {Math.round(analytics.averageMatchScore)}%
            </Text>
            <Text style={styles.analyticsLabel}>Avg Score</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsNumber}>
              {analytics.acceptedApplications}
            </Text>
            <Text style={styles.analyticsLabel}>Accepted</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
        <Text style={styles.loadingText}>Finding your perfect matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.subtitle}>AI-powered DJ opportunity matching</Text>
      </View>

      {renderAnalytics()}

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="hsl(0, 0%, 50%)" />
          <Text style={styles.emptyStateTitle}>No matches found</Text>
          <Text style={styles.emptyStateText}>
            We're working on finding the perfect opportunities for you. Check
            back soon!
          </Text>
        </View>
      ) : (
        <View style={styles.matchesContainer}>
          {matches.map(renderMatchCard)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Helvetica Neue",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  analyticsCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  analyticsTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  analyticsItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 16,
  },
  analyticsNumber: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
  },
  matchesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  matchCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  matchScoreContainer: {
    alignItems: "center",
  },
  matchScore: {
    fontSize: 32,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
  },
  matchScoreLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginTop: -4,
  },
  matchStatus: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  opportunityInfo: {
    marginBottom: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    marginBottom: 16,
  },
  opportunityDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  matchReasons: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
  },
  reasonsTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    marginBottom: 4,
  },
  matchActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  passButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  applyButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  applyButtonText: {
    color: "hsl(0, 0%, 0%)",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 24,
  },
});
