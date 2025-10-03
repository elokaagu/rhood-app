import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OpportunityCard({ opportunity, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: opportunity.image }}
          style={styles.featuredImage}
        />
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
      </View>
    </TouchableOpacity>
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
    flex: 1,
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
});
