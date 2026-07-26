import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
}) {
  const insets = useSafeAreaInsets();
  const { tutorialModalProps } = useAppTutorialModal(
    APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES,
    { preventShow: !!showSwipeTutorial }
  );

  const current = opportunities?.[currentOpportunityIndex];
  const isEmptyDeck =
    !isLoadingOpportunities &&
    currentOpportunityIndex >= (opportunities?.length ?? 0);
  const canApplyColor = dailyApplicationStats?.can_apply
    ? "hsl(75, 100%, 60%)"
    : "hsl(0, 100%, 60%)";
  const remaining = dailyApplicationStats?.remaining_applications ?? 0;
  const applyLabel =
    remaining === 1 ? "application left today" : "applications left today";

  return (
    <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
      <View style={styles.opportunitiesContainer}>
        <View style={styles.opportunitiesHeader}>
          <RhoodScreenTitleBlock
            title="Opportunities"
            subtitle={personalizedOpportunitiesSubtitle(user)}
            subtitleBottomSpacing={12}
          >
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
                <Text style={[styles.dailyApplicationNumber, { color: canApplyColor }]}>
                  {remaining}
                </Text>
                <Text style={styles.dailyApplicationRest}> {applyLabel}</Text>
              </Text>
            </View>
          </RhoodScreenTitleBlock>
        </View>
        <View
          style={[
            styles.opportunitiesCardContainer,
            isEmptyDeck && styles.opportunitiesCardContainerEmpty,
          ]}
        >
          {isLoadingOpportunities ? (
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
            />
          ) : (
            <View
              style={[
                styles.noMoreOpportunities,
                {
                  paddingTop: 14 + Math.max(0, Math.min(insets.top * 0.25, 6)),
                  paddingBottom: 12 + Math.max(insets.bottom, 6),
                },
              ]}
            >
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
