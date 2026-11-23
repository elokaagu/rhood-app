import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SwipeableOpportunityCard from "./SwipeableOpportunityCard";
import OpportunitiesSwipeTutorialModal from "./OpportunitiesSwipeTutorialModal";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import RhoodScreenTitleBlock from "./RhoodScreenTitleBlock";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";

const DEFAULT_OPPORTUNITIES_SUBTITLE = "Swipe to find your next gig";

function personalizedOpportunitiesSubtitle(user) {
  const meta = user?.user_metadata || {};
  const raw =
    (typeof meta.first_name === "string" && meta.first_name.trim()) ||
    (typeof meta.given_name === "string" && meta.given_name.trim()) ||
    (typeof meta.full_name === "string" &&
      meta.full_name.trim().split(/\s+/).filter(Boolean)[0]) ||
    "";
  if (!raw) return DEFAULT_OPPORTUNITIES_SUBTITLE;
  const first =
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return `Hi ${first}, ${DEFAULT_OPPORTUNITIES_SUBTITLE.toLowerCase()}`;
}

/**
 * Home swipe deck for gigs. Logic/state lives in App / useOpportunities; this is presentation only.
 */
export default function OpportunitiesScreen({
  user,
  styles,
  opportunities,
  currentOpportunityIndex,
  dailyApplicationStats,
  handleOpportunityPress,
  handleSwipeLeft,
  handleSwipeRight,
  resetOpportunities,
  isLoadingOpportunities,
  showSwipeTutorial,
  handleDismissSwipeTutorial,
  needsMixUploadGate = false,
  handleNavigateToUploadMix,
}) {
  const insets = useSafeAreaInsets();
  const [deckHeight, setDeckHeight] = useState(0);
  const deckPadding = StyleSheet.flatten(styles.opportunitiesCardContainer) || {};
  const handleDeckLayout = useCallback((event) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setDeckHeight((prev) => (prev === next ? prev : next));
  }, []);
  const { tutorialModalProps } = useAppTutorialModal(
    APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES,
    { preventShow: !!showSwipeTutorial || needsMixUploadGate }
  );

  const current = opportunities?.[currentOpportunityIndex];
  const isEmptyDeck =
    !isLoadingOpportunities &&
    (needsMixUploadGate ||
      currentOpportunityIndex >= (opportunities?.length ?? 0));
  const canApplyColor = dailyApplicationStats?.can_apply
    ? "hsl(75, 100%, 60%)"
    : "hsl(0, 100%, 60%)";
  const remaining = dailyApplicationStats?.remaining_applications ?? 0;
  const applyLabel =
    remaining === 1 ? "application left today" : "applications left today";
  const emptyCardInsets = {
    paddingTop: 14 + Math.max(0, Math.min(insets.top * 0.25, 6)),
    paddingBottom: 12 + Math.max(insets.bottom, 6),
  };

  return (
    <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
      <View style={styles.opportunitiesContainer}>
        <View style={styles.opportunitiesHeader}>
          <RhoodScreenTitleBlock
            title="Opportunities"
            subtitle={
              needsMixUploadGate
                ? "Upload a mix to unlock gigs"
                : personalizedOpportunitiesSubtitle(user)
            }
            subtitleBottomSpacing={12}
          >
            {!needsMixUploadGate ? (
              <View
                style={[
                  styles.dailyApplicationChip,
                  dailyApplicationStats?.can_apply === false &&
                    styles.dailyApplicationChipLimited,
                ]}
                accessibilityRole="text"
                accessibilityLabel={`${remaining} ${applyLabel}`}
              >
                <Ionicons
                  name={
                    dailyApplicationStats?.can_apply
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={18}
                  color={canApplyColor}
                />
                <Text style={styles.dailyApplicationChipText}>
                  <Text
                    style={[styles.dailyApplicationNumber, { color: canApplyColor }]}
                  >
                    {remaining}
                  </Text>
                  <Text style={styles.dailyApplicationRest}> {applyLabel}</Text>
                </Text>
              </View>
            ) : null}
          </RhoodScreenTitleBlock>
        </View>
        <View
          style={[
            styles.opportunitiesCardContainer,
            isEmptyDeck && styles.opportunitiesCardContainerEmpty,
          ]}
          onLayout={handleDeckLayout}
        >
          {needsMixUploadGate ? (
            <View style={[styles.noMoreOpportunities, emptyCardInsets]}>
              <View style={styles.noMoreBadgeWrap}>
                <Ionicons
                  name="musical-notes"
                  size={22}
                  color="hsl(0, 0%, 0%)"
                />
              </View>
              <Text style={styles.noMoreEyebrow}>Opportunities</Text>
              <Text
                style={styles.noMoreTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Upload a Mix
              </Text>
              <Text style={styles.noMoreSubtitle}>
                Add your first mix to unlock opportunities.
                {"\n"}
                Brands need to hear your sound before you can apply.
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleNavigateToUploadMix}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Upload a mix"
              >
                <Text style={styles.resetButtonText}>Upload Mix</Text>
              </TouchableOpacity>
              <Text style={styles.resetHintText}>
                Tip: You can also upload from Create or your profile.
              </Text>
            </View>
          ) : isLoadingOpportunities ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading opportunities...</Text>
            </View>
          ) : currentOpportunityIndex < (opportunities?.length ?? 0) ? (
            // key=index remounts the card so swipe / entrance animations reset per opportunity
            <SwipeableOpportunityCard
              key={currentOpportunityIndex}
              opportunity={current}
              onPress={() => {
                if (current) handleOpportunityPress?.(current);
              }}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isTopCard={true}
              dailyApplicationStats={dailyApplicationStats}
              availableHeight={
                deckHeight > 0
                  ? deckHeight -
                    (deckPadding.paddingTop || 0) -
                    (deckPadding.paddingBottom || 0)
                  : 0
              }
            />
          ) : (
            <View style={[styles.noMoreOpportunities, emptyCardInsets]}>
              <View style={styles.noMoreBadgeWrap}>
                <Ionicons
                  name="checkmark"
                  size={22}
                  color="hsl(0, 0%, 0%)"
                />
              </View>
              <Text style={styles.noMoreEyebrow}>Opportunities</Text>
              <Text
                style={styles.noMoreTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                All Caught Up
              </Text>
              <Text style={styles.noMoreSubtitle}>
                You have seen every available opportunity for now.
                {"\n"}
                New gigs will appear here as they go live.
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetOpportunities}
                activeOpacity={0.85}
              >
                <Text style={styles.resetButtonText}>Start Over</Text>
              </TouchableOpacity>
              <Text style={styles.resetHintText}>
                Tip: Pull down later to refresh for new listings.
              </Text>
            </View>
          )}
        </View>
        <OpportunitiesSwipeTutorialModal
          visible={!!showSwipeTutorial}
          onDismiss={handleDismissSwipeTutorial}
        />
        {tutorialModalProps ? (
          <AppScreenTutorialModal {...tutorialModalProps} />
        ) : null}
      </View>
    </View>
  );
}
