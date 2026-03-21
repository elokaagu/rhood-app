import React, { memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import { HapticPatterns } from "../lib/haptics";
import styles from "./ConnectionsScreen.styles";

/**
 * Memoized Discover tab header (Popular DJs, Nearby DJs, Opportunities, Connection Requests).
 * Reduces re-renders when parent state changes but these props are unchanged.
 */
function DiscoverListHeader({
  popularDJs,
  nearbyDJs,
  nearbyOpportunities,
  searchQuery,
  userCity,
  onNavigate,
  onOpenLocationModal,
  incomingConnectionRequests,
  acceptingUserId,
  decliningUserId,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const showCarousels = !searchQuery?.trim();
  return (
    <View style={styles.discoverList}>
      {showCarousels && popularDJs?.length > 0 && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>Popular DJs</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recommendationsScroll}
            contentContainerStyle={styles.recommendationsContent}
          >
            {popularDJs.map((dj) => (
              <TouchableOpacity
                key={dj.id}
                style={styles.recommendationCard}
                onPress={() => onNavigate?.("user-profile", { userId: dj.id, djName: dj.dj_name })}
                activeOpacity={0.8}
              >
                <View style={styles.recommendationImageContainer}>
                  <ProgressiveImage
                    source={dj.profile_image_url ? { uri: dj.profile_image_url } : null}
                    style={styles.recommendationImage}
                    placeholder={
                      <View style={[styles.recommendationImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="person" size={40} color="hsl(75, 100%, 60%)" />
                      </View>
                    }
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
                    style={styles.recommendationGradient}
                  />
                  <View style={styles.recommendationInfo}>
                    <Text style={styles.recommendationTitle} numberOfLines={1}>
                      {String(dj.dj_name || "DJ")}
                    </Text>
                    {dj.city && String(dj.city).trim() ? (
                      <Text style={styles.recommendationArtist} numberOfLines={1}>
                        {String(dj.city)}
                      </Text>
                    ) : null}
                    {Array.isArray(dj.genres) && dj.genres.length > 0 ? (
                      <Text style={styles.recommendationGenre} numberOfLines={1}>
                        {String(dj.genres.slice(0, 2).join(", ") || "")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.recommendationsDivider} />
        </View>
      )}

      {showCarousels && nearbyDJs?.length > 0 && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>DJs Near You</Text>
            <TouchableOpacity onPress={onOpenLocationModal} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
              <Text style={styles.sectionHeaderLink}>Location</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recommendationsScroll}
            contentContainerStyle={styles.recommendationsContent}
          >
            {nearbyDJs.map((dj) => (
              <TouchableOpacity
                key={dj.id}
                style={styles.recommendationCard}
                onPress={() => {
                  HapticPatterns.itemPress();
                  onNavigate?.("user-profile", { userId: dj.id, djName: dj.dj_name });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.recommendationImageContainer}>
                  <ProgressiveImage
                    source={dj.profile_image_url ? { uri: dj.profile_image_url } : null}
                    style={styles.recommendationImage}
                    placeholder={
                      <View style={[styles.recommendationImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="person" size={40} color="hsl(75, 100%, 60%)" />
                      </View>
                    }
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
                    style={styles.recommendationGradient}
                  />
                  <View style={styles.recommendationInfo}>
                    <Text style={styles.recommendationTitle} numberOfLines={1}>
                      {String(dj.dj_name || "DJ")}
                    </Text>
                    {dj.city && String(dj.city).trim() ? (
                      <Text style={styles.recommendationArtist} numberOfLines={1}>
                        {String(dj.city)}
                      </Text>
                    ) : null}
                    {Array.isArray(dj.genres) && dj.genres.length > 0 ? (
                      <Text style={styles.recommendationGenre} numberOfLines={1}>
                        {String(dj.genres.slice(0, 2).join(", ") || "")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.recommendationsDivider} />
        </View>
      )}

      {showCarousels && nearbyOpportunities?.length > 0 && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>Opportunities Near You</Text>
            <TouchableOpacity onPress={onOpenLocationModal} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
              <Text style={styles.sectionHeaderLink}>Location</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recommendationsScroll}
            contentContainerStyle={styles.recommendationsContent}
          >
            {nearbyOpportunities.map((opp) => (
              <TouchableOpacity
                key={opp.id}
                style={styles.opportunityCard}
                onPress={() => {
                  HapticPatterns.itemPress();
                  onNavigate?.("opportunities");
                }}
                activeOpacity={0.8}
              >
                <View style={styles.opportunityImageContainer}>
                  <Image source={{ uri: opp.image }} style={styles.opportunityImage} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
                    style={styles.opportunityGradient}
                  />
                  <View style={styles.opportunityInfo}>
                    <Text style={styles.opportunityTitle} numberOfLines={2}>
                      {String(opp.title)}
                    </Text>
                    <Text style={styles.opportunityVenue} numberOfLines={1}>
                      {String(opp.venue)}
                    </Text>
                    <View style={styles.opportunityMeta}>
                      <Text style={styles.opportunityMetaText} numberOfLines={1}>
                        {String(opp.date)} • {String(opp.city)}
                      </Text>
                    </View>
                    {opp.compensation ? (
                      <Text style={styles.opportunityCompensation} numberOfLines={1}>
                        {String(opp.compensation)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.recommendationsDivider} />
        </View>
      )}

      {incomingConnectionRequests?.length > 0 && (
        <View style={[styles.pendingRequestsSection, { marginTop: 0 }]}>
          <View style={styles.pendingRequestsHeader}>
            <Text style={styles.pendingRequestsTitle}>Connection Requests</Text>
          </View>
          {incomingConnectionRequests.map((request) => {
            const isAccepting = acceptingUserId && request.id === acceptingUserId;
            const isDeclining = decliningUserId && request.id === decliningUserId;
            const isProcessing = isAccepting || isDeclining;
            return (
              <View key={request.id} style={styles.pendingRequestCard}>
                <View style={styles.pendingRequestInfo}>
                  <ProgressiveImage
                    source={request.profileImage ? { uri: request.profileImage } : null}
                    style={styles.pendingRequestAvatar}
                  />
                  <View style={styles.pendingRequestDetails}>
                    <Text style={styles.pendingRequestName} numberOfLines={1}>
                      {request.name || "DJ"}
                    </Text>
                    <Text style={styles.pendingRequestSubtitle} numberOfLines={1}>
                      Wants to connect
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingRequestActions}>
                  <TouchableOpacity
                    style={[styles.pendingActionButton, styles.pendingAcceptButton, isProcessing && styles.pendingActionDisabled]}
                    onPress={() => onAcceptRequest(request)}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                  >
                    {isAccepting ? (
                      <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="hsl(0, 0%, 0%)" />
                        <Text style={styles.pendingActionText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pendingActionButton, styles.pendingDeclineButton, isProcessing && styles.pendingActionDisabled]}
                    onPress={() => onDeclineRequest(request)}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                  >
                    {isDeclining ? (
                      <ActivityIndicator size="small" color="hsl(0, 0%, 70%)" />
                    ) : (
                      <>
                        <Ionicons name="close" size={16} color="hsl(0, 0%, 70%)" />
                        <Text style={[styles.pendingActionText, styles.pendingDeclineText]}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.communitySubtitleSection}>
        <Text style={styles.communitySubtitle}>Our community</Text>
      </View>
    </View>
  );
}

export default memo(DiscoverListHeader);
