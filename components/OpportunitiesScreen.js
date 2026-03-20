import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SwipeableOpportunityCard from "./SwipeableOpportunityCard";

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
  const current = opportunities?.[currentOpportunityIndex];
  const canApplyColor = dailyApplicationStats?.can_apply
    ? "hsl(75, 100%, 60%)"
    : "hsl(0, 100%, 60%)";

  return (
    <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
      <View style={styles.opportunitiesContainer}>
        <View style={styles.opportunitiesHeader}>
          <Text style={styles.tsBlockBoldHeading}>OPPORTUNITIES</Text>
          <Text style={styles.opportunitiesSubtitle}>
            Swipe to find your next gig
          </Text>
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
        </View>
        <View style={styles.opportunitiesCardContainer}>
          {isLoadingOpportunities ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading opportunities...</Text>
            </View>
          ) : currentOpportunityIndex < (opportunities?.length ?? 0) ? (
            <SwipeableOpportunityCard
              key={currentOpportunityIndex}
              opportunity={current}
              onPress={() => handleOpportunityPress?.(current)}
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
        {showSwipeTutorial && (
          <Modal
            transparent={true}
            visible={showSwipeTutorial}
            animationType="fade"
            onRequestClose={handleDismissSwipeTutorial}
          >
            <View style={styles.tutorialOverlay}>
              <View style={styles.tutorialContent}>
                <View style={styles.tutorialHeader}>
                  <Text style={styles.tutorialTitle}>How to Use</Text>
                  <TouchableOpacity
                    onPress={handleDismissSwipeTutorial}
                    style={styles.tutorialCloseButton}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color="hsl(0, 0%, 100%)"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.tutorialInstructions}>
                  <View style={styles.tutorialInstructionRow}>
                    <View style={styles.tutorialIconContainer}>
                      <Ionicons
                        name="arrow-forward"
                        size={32}
                        color="hsl(75, 100%, 60%)"
                      />
                    </View>
                    <View style={styles.tutorialTextContainer}>
                      <Text style={styles.tutorialInstructionTitle}>
                        Swipe Right
                      </Text>
                      <Text style={styles.tutorialInstructionText}>
                        To apply for an opportunity
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tutorialInstructionRow}>
                    <View style={styles.tutorialIconContainer}>
                      <Ionicons
                        name="arrow-back"
                        size={32}
                        color="hsl(0, 100%, 60%)"
                      />
                    </View>
                    <View style={styles.tutorialTextContainer}>
                      <Text style={styles.tutorialInstructionTitle}>
                        Swipe Left
                      </Text>
                      <Text style={styles.tutorialInstructionText}>
                        To dismiss and see the next opportunity
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.tutorialGotItButton}
                  onPress={handleDismissSwipeTutorial}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tutorialGotItButtonText}>Got It</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </View>
  );
}
