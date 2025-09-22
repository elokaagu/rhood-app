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
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: opportunity.image }} style={styles.featuredImage} />
        <View style={styles.imageOverlay}>
          <Text style={styles.venueName}>{opportunity.venue}</Text>
          <Text style={styles.eventTitle}>{opportunity.title}</Text>
        </View>
      </View>

      {/* Event details - compact */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="hsl(75, 100%, 60%)" />
          <Text style={styles.detailText}>{opportunity.audienceSize}</Text>
        </View>
      </View>

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
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    height: 200,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 16,
  },
  venueName: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    lineHeight: 26,
  },
  details: {
    padding: 16,
    paddingBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    marginLeft: 8,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
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
