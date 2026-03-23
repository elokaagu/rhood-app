import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SwipeableOpportunityCard from "./SwipeableOpportunityCard";
import OpportunitiesSwipeTutorialModal from "./OpportunitiesSwipeTutorialModal";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import RhoodScreenTitleBlock from "./RhoodScreenTitleBlock";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";

/**
 * Home swipe deck for gigs. Logic/state lives in App / useOpportunities; this is presentation only.
 */
export default function OpportunitiesScreen({
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
  const { tutorialModalProps } = useAppTutorialModal(
    APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES,
    { preventShow: !!showSwipeTutorial }
  );

  const current = opportunities?.[currentOpportunityIndex];
  const canApplyColor = dailyApplicationStats?.can_apply
    ? "hsl(75, 100%, 60%)"
    : "hsl(0, 100%, 60%)";

  return (
    <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
      <View style={styles.opportunitiesContainer}>
        <View style={styles.opportunitiesHeader}>
          <RhoodScreenTitleBlock
            title="Opportunities"
            subtitle="Swipe to find your next gig"
            subtitleBottomSpacing={8}
          >
            <View style={styles.dailyApplicationCounter}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={canApplyColor}
              />
              <Text
                style={[
                  styles.dailyApplicationText,
                  { color: canApplyColor },
                ]}
              >
                {dailyApplicationStats?.remaining_applications ?? 0} applications
                remaining today
              </Text>
            </View>
          </RhoodScreenTitleBlock>
        </View>
        <View style={styles.opportunitiesCardContainer}>
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
            <View style={styles.noMoreOpportunities}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.noMoreTitle}>All Caught Up!</Text>
              <Text style={styles.noMoreSubtitle}>
                You've seen all available opportunities. Check back later for new
                gigs!
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetOpportunities}
              >
                <Text style={styles.resetButtonText}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <OpportunitiesSwipeTutorialModal
          visible={!!showSwipeTutorial}
          onDismiss={handleDismissSwipeTutorial}
          styles={styles}
        />
        {tutorialModalProps ? (
          <AppScreenTutorialModal {...tutorialModalProps} />
        ) : null}
      </View>
    </View>
  );
}
