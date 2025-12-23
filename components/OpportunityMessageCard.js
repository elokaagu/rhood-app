/**
 * OpportunityMessageCard Component
 * Displays an opportunity as a card within a chat message
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function OpportunityMessageCard({
  opportunity,
  isOwn = false,
  onPress,
}) {
  if (!opportunity) return null;

  const handlePress = () => {
    if (onPress) {
      onPress(opportunity);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isOwn ? styles.ownCard : styles.otherCard,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="briefcase"
              size={20}
              color={isOwn ? "hsl(0, 0%, 0%)" : "hsl(75, 100%, 60%)"}
            />
          </View>
          <Text
            style={[
              styles.title,
              isOwn ? styles.ownTitle : styles.otherTitle,
            ]}
            numberOfLines={2}
          >
            {opportunity.title || "DJ Opportunity"}
          </Text>
        </View>

        {/* Description */}
        {opportunity.description && (
          <Text
            style={[
              styles.description,
              isOwn ? styles.ownDescription : styles.otherDescription,
            ]}
            numberOfLines={3}
          >
            {opportunity.description}
          </Text>
        )}

        {/* Details */}
        <View style={styles.details}>
          {opportunity.date && (
            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(0, 0%, 60%)"}
              />
              <Text
                style={[
                  styles.detailText,
                  isOwn ? styles.ownDetailText : styles.otherDetailText,
                ]}
              >
                {opportunity.date}
              </Text>
            </View>
          )}

          {opportunity.time && (
            <View style={styles.detailRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(0, 0%, 60%)"}
              />
              <Text
                style={[
                  styles.detailText,
                  isOwn ? styles.ownDetailText : styles.otherDetailText,
                ]}
              >
                {opportunity.time}
              </Text>
            </View>
          )}

          {opportunity.location && (
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(0, 0%, 60%)"}
              />
              <Text
                style={[
                  styles.detailText,
                  isOwn ? styles.ownDetailText : styles.otherDetailText,
                ]}
                numberOfLines={1}
              >
                {opportunity.location}
              </Text>
            </View>
          )}

          {opportunity.compensation && (
            <View style={styles.detailRow}>
              <Ionicons
                name="cash-outline"
                size={14}
                color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(0, 0%, 60%)"}
              />
              <Text
                style={[
                  styles.detailText,
                  isOwn ? styles.ownDetailText : styles.otherDetailText,
                ]}
              >
                {opportunity.compensation}
              </Text>
            </View>
          )}
        </View>

        {/* Footer with CTA */}
        <View style={[styles.footer, isOwn ? styles.footerOwn : styles.footerOther]}>
          <View style={styles.footerContent}>
            <Text
              style={[
                styles.footerText,
                isOwn ? styles.ownFooterText : styles.otherFooterText,
              ]}
            >
              Tap to view details
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={isOwn ? "hsl(0, 0%, 40%)" : "hsl(75, 100%, 60%)"}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    maxWidth: "100%",
    marginVertical: 4,
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
  footerOwn: {
    borderTopColor: "rgba(0, 0, 0, 0.15)",
  },
  footerOther: {
    borderTopColor: "hsl(75, 100%, 20%)",
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(75, 255, 150, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    lineHeight: 20,
  },
  ownTitle: {
    color: "hsl(0, 0%, 0%)",
  },
  otherTitle: {
    color: "hsl(75, 100%, 60%)",
  },
  description: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    lineHeight: 20,
    marginBottom: 12,
  },
  ownDescription: {
    color: "hsl(0, 0%, 30%)",
  },
  otherDescription: {
    color: "hsl(0, 0%, 80%)",
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    flex: 1,
  },
  ownDetailText: {
    color: "hsl(0, 0%, 40%)",
  },
  otherDetailText: {
    color: "hsl(0, 0%, 70%)",
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
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

