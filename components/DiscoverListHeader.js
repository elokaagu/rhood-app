import React, { memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import { HapticPatterns } from "../lib/haptics";
import styles from "./ConnectionsScreen.styles";

/** Shared gradient for DJ recommendation image overlays */
const RECOMMENDATION_CARD_GRADIENT = [
  "transparent",
  "rgba(0, 0, 0, 0.3)",
  "rgba(0, 0, 0, 0.8)",
  "rgba(0, 0, 0, 0.95)",
];

function DiscoverCarouselSkeleton({ cardStyle }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.recommendationsScroll}
      contentContainerStyle={styles.recommendationsContent}
    >
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={cardStyle} />
      ))}
    </ScrollView>
  );
}

function RecommendationImagePlaceholder() {
  return (
    <View style={[styles.recommendationImage, styles.recommendationImagePlaceholderRoot]}>
      <Ionicons name="person" size={40} color="hsl(75, 100%, 60%)" />
    </View>
  );
}

/**
 * Horizontal DJ cards (Popular / Nearby) — shared carousel chrome and card layout.
 */
function DJRecommendationCarousel({
  djs,
  loading,
  skeletonCardStyle,
  onDjPress,
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
}) {
  const list = djs ?? [];
  if (loading && list.length === 0) {
    return <DiscoverCarouselSkeleton cardStyle={skeletonCardStyle} />;
  }
  if (!loading && list.length === 0) {
    return (
      <View style={styles.nearbyEmptyCard}>
        <Ionicons name="location-outline" size={20} color="hsl(75, 100%, 60%)" />
        <Text style={styles.nearbyEmptyTitle}>
          {emptyTitle || "No DJs in your city yet"}
        </Text>
        <Text style={styles.nearbyEmptySubtitle}>
          {emptySubtitle ||
            "Set your city in Edit Profile to see DJs in the same city."}
        </Text>
        {onEmptyAction ? (
          <TouchableOpacity
            style={styles.nearbyEmptyAction}
            onPress={() => {
              HapticPatterns.buttonPress();
              onEmptyAction();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.nearbyEmptyActionText}>
              {emptyActionLabel || "Set your city"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.recommendationsScroll}
      contentContainerStyle={styles.recommendationsContent}
    >
      {list.map((dj, index) => (
        <TouchableOpacity
          key={dj?.id != null ? String(dj.id) : `dj-${index}`}
          style={styles.recommendationCard}
          onPress={() => onDjPress?.(dj)}
          activeOpacity={0.8}
        >
          <View style={styles.recommendationImageContainer}>
            <ProgressiveImage
              source={dj.profile_image_url ? { uri: dj.profile_image_url } : null}
              style={styles.recommendationImage}
              placeholder={<RecommendationImagePlaceholder />}
            />
            <LinearGradient colors={RECOMMENDATION_CARD_GRADIENT} style={styles.recommendationGradient} />
            <View style={styles.recommendationInfo}>
              <Text style={styles.recommendationTitle} numberOfLines={1}>
                {dj.dj_name || "DJ"}
              </Text>
              {dj.city && String(dj.city).trim() ? (
                <Text style={styles.recommendationArtist} numberOfLines={1}>
                  {dj.city}
                </Text>
              ) : null}
              {Array.isArray(dj.genres) && dj.genres.length > 0 ? (
                <Text style={styles.recommendationGenre} numberOfLines={1}>
                  {dj.genres.slice(0, 2).join(", ")}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Memoized Discover tab header (Popular DJs, Nearby DJs, Connection Requests).
 * Reduces re-renders when parent state changes but these props are unchanged.
 */
function DiscoverListHeader({
  popularDJs,
  popularDJsLoading = false,
  nearbyDJs,
  nearbyDJsLoading = false,
  searchQuery,
  onNavigate,
  incomingConnectionRequests,
  acceptingUserId,
  decliningUserId,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const showCarousels = !searchQuery?.trim();
  const showPopularBlock =
    showCarousels && (popularDJsLoading || (popularDJs?.length ?? 0) > 0);
  // Keep this section mounted to avoid "load then disappear" jank when empty.
  const showNearbyBlock = showCarousels;

  const requests = incomingConnectionRequests ?? [];

  return (
    <View>
      {showPopularBlock && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>Popular DJs</Text>
          </View>
          <DJRecommendationCarousel
            djs={popularDJs}
            loading={popularDJsLoading}
            skeletonCardStyle={styles.discoverCarouselSkeletonCard}
            onDjPress={(dj) =>
              onNavigate?.("user-profile", { userId: dj.id, djName: dj.dj_name })
            }
          />
          <View style={styles.recommendationsDivider} />
        </View>
      )}

      {showNearbyBlock && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>DJs Near You</Text>
          </View>
          <DJRecommendationCarousel
            djs={nearbyDJs}
            loading={nearbyDJsLoading}
            skeletonCardStyle={styles.discoverCarouselSkeletonCard}
            onDjPress={(dj) => {
              HapticPatterns.itemPress();
              onNavigate?.("user-profile", { userId: dj.id, djName: dj.dj_name });
            }}
            emptyTitle="No DJs in your city yet"
            emptySubtitle="Set or update your city to see DJs near you."
            emptyActionLabel="Set your city"
            onEmptyAction={() =>
              onNavigate?.("edit-profile", { focusField: "city" })
            }
          />
          <View style={styles.recommendationsDivider} />
        </View>
      )}

      {requests.length > 0 && (
        <View style={[styles.pendingRequestsSection, { marginTop: 0 }]}>
          <View style={styles.pendingRequestsHeader}>
            <Text style={styles.pendingRequestsTitle}>Connection Requests</Text>
          </View>
          {requests.map((request) => {
            const isAccepting = request.id === acceptingUserId;
            const isDeclining = request.id === decliningUserId;
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
                    style={[
                      styles.pendingActionButton,
                      styles.pendingAcceptButton,
                      isProcessing && styles.pendingActionDisabled,
                    ]}
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
                    style={[
                      styles.pendingActionButton,
                      styles.pendingDeclineButton,
                      isProcessing && styles.pendingActionDisabled,
                    ]}
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
