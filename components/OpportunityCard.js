import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OpportunityCard({ opportunity, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Header with venue image and basic info */}
      <View style={styles.header}>
        <Image source={{ uri: opportunity.image }} style={styles.venueImage} />
        <View style={styles.headerContent}>
          <Text style={styles.venueName}>{opportunity.venue}</Text>
          <Text style={styles.eventTitle}>{opportunity.title}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="hsl(0, 0%, 60%)" />
            <Text style={styles.location}>{opportunity.location}</Text>
          </View>
        </View>
      </View>

      {/* Event details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.audienceSize}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {opportunity.description}
      </Text>

      {/* Genres */}
      <View style={styles.genresContainer}>
        {opportunity.genres.map((genre, index) => (
          <View key={index} style={styles.genreTag}>
            <Text style={styles.genreText}>{genre}</Text>
          </View>
        ))}
      </View>

      {/* Footer with compensation and apply button */}
      <View style={styles.footer}>
        <View style={styles.compensationContainer}>
          <Text style={styles.compensationLabel}>Compensation:</Text>
          <Text style={styles.compensationAmount}>{opportunity.compensation}</Text>
        </View>
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
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
  },
  header: {
    flexDirection: "row",
    marginBottom: 16,
  },
  venueImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },
  venueName: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  location: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginLeft: 4,
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  genreTag: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compensationContainer: {
    flex: 1,
  },
  compensationLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 2,
  },
  compensationAmount: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    color: "hsl(75, 100%, 60%)",
  },
  applyButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "600",
  },
});
