import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, Image, AppState, InteractionManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { db, supabase } from "../lib/supabase";
import { APPLICATION_LIMITS } from "../lib/performanceConstants";
import { track, AnalyticsEvents } from "../lib/analytics";
import {
  transformOpportunityRow,
  mergeOpportunityFromRealtime,
} from "../lib/opportunities/transformOpportunityRow";
import {
  loadPostApplySuccessContext,
  classifyApplicationError,
} from "../lib/opportunities/applicationFlow";
import { SCREENS } from "../navigation/routes";

/** Fallback stats refresh while on screen; primary updates are mount, foreground, and post-apply. */
const DAILY_STATS_REFRESH_INTERVAL_MS = 90_000;

/**
 * Hook that owns opportunity-related state, data fetching, swipe handling,
 * application logic, and real-time subscriptions.
 *
 * Navigation and modal copy remain orchestrated here; domain transforms and
 * apply-side effects are split into `lib/opportunities/*` for easier testing.
 */
export default function useOpportunities({
  user,
  currentScreen,
  screenParams,
  userLocation,
  showCustomModal,
  hideCustomModal,
  setCurrentScreen,
  setScreenParams,
}) {
  const [opportunities, setOpportunities] = useState([]);
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [swipedOpportunities, setSwipedOpportunities] = useState([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [dailyApplicationStats, setDailyApplicationStats] = useState({
    daily_count: 0,
    remaining_applications: 5,
    can_apply: true,
  });
  const [networkErrorCount, setNetworkErrorCount] = useState(0);

  const intervalRef = useRef(null);
  const fetchOpportunitiesRequestIdRef = useRef(0);
  const userLocationRef = useRef(userLocation);
  const currentOpportunityIndexRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    currentOpportunityIndexRef.current = currentOpportunityIndex;
  }, [currentOpportunityIndex]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchOpportunities = useCallback(async () => {
    const requestId = ++fetchOpportunitiesRequestIdRef.current;
    try {
      setIsLoadingOpportunities(true);

      const { data: opportunitiesData, error: opportunitiesError } =
        await supabase
          .from("opportunities")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      if (opportunitiesError) {
        if (__DEV__) console.error("Error fetching opportunities:", opportunitiesError);
        if (requestId === fetchOpportunitiesRequestIdRef.current) {
          setOpportunities([]);
        }
        return;
      }

      if (requestId !== fetchOpportunitiesRequestIdRef.current) return;

      if (__DEV__) {
        console.log(`Fetched ${opportunitiesData.length} opportunities from database`);
      }

      const transformedOpportunities = opportunitiesData.map((opp) =>
        transformOpportunityRow(opp, userLocation)
      );

      setOpportunities(transformedOpportunities);

      if (user?.id) {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          if (requestId !== fetchOpportunitiesRequestIdRef.current) return;
          setDailyApplicationStats(stats);
          if (__DEV__) console.log("User daily application stats:", stats);
        } catch (statsError) {
          if (__DEV__) console.error("Error loading daily stats:", statsError);
          if (requestId === fetchOpportunitiesRequestIdRef.current) {
            setDailyApplicationStats({
              daily_count: 0,
              remaining_applications: 5,
              can_apply: true,
            });
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching opportunities:", error);
      if (requestId === fetchOpportunitiesRequestIdRef.current) {
        setOpportunities([]);
      }
    } finally {
      if (requestId === fetchOpportunitiesRequestIdRef.current) {
        setIsLoadingOpportunities(false);
      }
    }
  }, [user?.id, userLocation]);

  /** Full reload when location / user changes would skew distances — call from screen if needed. */
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  /** Deep link from notifications: jump swipe deck to a specific opportunity once rows are loaded. */
  useEffect(() => {
    const focusId = screenParams?.focusOpportunityId;
    if (
      !focusId ||
      currentScreen !== SCREENS.OPPORTUNITIES ||
      !opportunities?.length
    ) {
      return;
    }
    const idx = opportunities.findIndex(
      (o) => String(o.id) === String(focusId)
    );
    if (idx < 0) return;
    setCurrentOpportunityIndex(idx);
    setScreenParams((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const { focusOpportunityId: _removed, ...rest } = prev;
      return rest;
    });
  }, [
    currentScreen,
    screenParams?.focusOpportunityId,
    opportunities,
    setScreenParams,
  ]);

  useEffect(() => {
    if (!opportunities?.length) return;
    const uris = new Set();
    const addUri = (opp) => {
      const raw =
        opp?.image || opp?.image_url || opp?.cover_image_url || null;
      if (typeof raw === "string" && /^https?:\/\//i.test(raw.trim())) {
        uris.add(raw.trim());
      }
    };
    for (let i = 0; i < 4; i++) {
      const idx = currentOpportunityIndex + i;
      if (idx >= opportunities.length) break;
      addUri(opportunities[idx]);
    }
    uris.forEach((uri) => {
      Image.prefetch(uri).catch(() => {});
    });
  }, [opportunities, currentOpportunityIndex]);

  const handleOpportunityPress = useCallback(
    (opportunity) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      track(AnalyticsEvents.OPPORTUNITY_VIEWED, {
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        opportunity_location: opportunity.location,
      });

      showCustomModal({
        type: "info",
        title: opportunity.title,
        message: opportunity.description || "",
        eventDetails: {
          date: opportunity.date,
          time: opportunity.time,
          compensation: opportunity.compensation,
          location: opportunity.location,
          description: opportunity.description,
          distanceFormatted: opportunity.distanceFormatted,
        },
        primaryButtonText: "Apply",
        secondaryButtonText: "Close",
        showShareButton: true,
        onPrimaryPress: () => {
          showCustomModal({
            type: "success",
            title: "Application Sent!",
            message: `Your application for ${opportunity.title} has been sent successfully. You'll hear back within 48 hours.`,
            primaryButtonText: "OK",
          });
        },
      });
    },
    [showCustomModal]
  );

  const handleDismissSwipeTutorial = useCallback(async () => {
    try {
      await AsyncStorage.setItem("hasSeenSwipeTutorial", "true");
      setShowSwipeTutorial(false);
    } catch (error) {
      if (__DEV__) console.error("Error saving swipe tutorial state:", error);
      setShowSwipeTutorial(false);
    }
  }, []);

  const handleSwipeLeft = useCallback(() => {
    const currentOpportunity = opportunities[currentOpportunityIndex];
    setSwipedOpportunities((prev) => [
      ...prev,
      { ...currentOpportunity, action: "pass" },
    ]);
    setCurrentOpportunityIndex((prev) => prev + 1);
  }, [opportunities, currentOpportunityIndex]);

  const resetOpportunities = useCallback(() => {
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
  }, []);

  const refreshOpportunities = useCallback(async () => {
    await fetchOpportunities();
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
  }, [fetchOpportunities]);

  const refreshDailyApplicationStats = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const updatedStats = await db.getUserDailyApplicationStats(userId);
      if (isMountedRef.current) {
        setDailyApplicationStats(updatedStats);
      }
      if (__DEV__) console.log("Updated daily application stats:", updatedStats);
    } catch (statsError) {
      if (__DEV__) console.error("Error refreshing daily stats:", statsError);
    }
  }, []);

  const showPostApplySuccessModal = useCallback(
    async (opportunity, applicationId) => {
      const ctx = await loadPostApplySuccessContext(user.id, applicationId);
      if (!isMountedRef.current) return;

      const boostMessage = ctx.canBoost
        ? `\n\n💡 Boost your application to the top for 24 hours (10 credits)`
        : applicationId
        ? `\n\n💡 Boost your application to the top for 24 hours (requires 10 credits)`
        : "";

      showCustomModal({
        type: "success",
        title: "Application Sent!",
        message: `Your application for ${opportunity.title} has been sent successfully. You have ${ctx.updatedRemaining} applications remaining today.${boostMessage}`,
        primaryButtonText: ctx.canBoost ? "Boost" : "OK",
        secondaryButtonText: ctx.canBoost ? "Skip" : undefined,
        onPrimaryPress:
          ctx.canBoost && applicationId
            ? async () => {
                try {
                  hideCustomModal();
                  await db.boostApplication(applicationId, 24, 10);
                  const updatedProfile = await db.getUserProfile(user.id);
                  if (!isMountedRef.current) return;
                  showCustomModal({
                    type: "success",
                    title: "Application Boosted!",
                    message: `Your application has been boosted to the top of the list for 24 hours. You now have ${updatedProfile?.credits || 0} credits remaining.`,
                    primaryButtonText: "OK",
                  });
                } catch (boostError) {
                  if (__DEV__) console.error("Error boosting:", boostError);
                  if (!isMountedRef.current) return;
                  showCustomModal({
                    type: "error",
                    title: "Boost Failed",
                    message: boostError?.message || "Failed to boost application",
                    primaryButtonText: "OK",
                  });
                }
              }
            : undefined,
      });
    },
    [user?.id, showCustomModal, hideCustomModal]
  );

  const handleApplicationFlowError = useCallback(
    (error) => {
      const classified = classifyApplicationError(error);
      const errorMessage = classified.message;

      if (
        classified.kind === "daily_limit" ||
        classified.kind === "already_applied" ||
        classified.kind === "missing_mix"
      ) {
        if (__DEV__) console.warn("Application handled error:", errorMessage);
      } else {
        if (__DEV__) console.error("Unexpected application error:", error);
      }

      if (classified.kind === "daily_limit") {
        showCustomModal({
          type: "warning",
          title: "Daily Limit Reached",
          message: errorMessage,
          primaryButtonText: "OK",
        });
        return;
      }

      if (classified.kind === "already_applied") {
        showCustomModal({
          type: "info",
          title: "Already Applied",
          message:
            "You've already applied for this opportunity. We'll notify you on the outcome soon.",
          primaryButtonText: "OK",
          onPrimaryPress: () => {
            hideCustomModal();
            setCurrentOpportunityIndex((prev) => prev + 1);
            setSelectedOpportunity(null);
          },
        });
        return;
      }

      if (classified.kind === "missing_mix") {
        showCustomModal({
          type: "warning",
          title: "Upload Required",
          message: errorMessage,
          primaryButtonText: "Upload Mix",
          onPrimaryPress: () => {
            setCurrentScreen("upload-mix");
            hideCustomModal();
            setCurrentOpportunityIndex((prev) => prev + 1);
            setSelectedOpportunity(null);
          },
          secondaryButtonText: "OK",
          onSecondaryPress: () => {
            setCurrentOpportunityIndex((prev) => prev + 1);
            setSelectedOpportunity(null);
            hideCustomModal();
          },
        });
        return;
      }

      showCustomModal({
        type: "error",
        title: "Application Failed",
        message: `There was an error submitting your application: ${
          errorMessage || "Unknown error"
        }. Please try again.`,
        primaryButtonText: "OK",
      });
    },
    [showCustomModal, hideCustomModal, setCurrentScreen]
  );

  const handleConfirmApply = useCallback(
    async (opportunity) => {
      if (!user?.id) {
        if (__DEV__) console.warn("handleConfirmApply: no authenticated user");
        return;
      }
      try {
        if (__DEV__) {
          console.log("Starting application for:", opportunity.title);
          console.log("User ID:", user.id, "Opportunity ID:", opportunity.id);
        }

        const application = await db.applyToOpportunity(opportunity.id, user.id);
        const applicationId = application?.id;

        await track(AnalyticsEvents.OPPORTUNITY_APPLIED, {
          opportunity_id: opportunity.id,
          opportunity_title: opportunity.title,
          opportunity_location: opportunity.location,
          opportunity_compensation: opportunity.compensation,
          distance_km: opportunity.distance || null,
        });

        await refreshDailyApplicationStats(user.id);

        setSwipedOpportunities((prev) => [
          ...prev,
          { ...opportunity, action: "applied" },
        ]);
        setCurrentOpportunityIndex((prev) => prev + 1);

        InteractionManager.runAfterInteractions(() => {
          void showPostApplySuccessModal(opportunity, applicationId);
        });
      } catch (error) {
        handleApplicationFlowError(error);
      } finally {
        setSelectedOpportunity(null);
      }
    },
    [
      user?.id,
      refreshDailyApplicationStats,
      showPostApplySuccessModal,
      handleApplicationFlowError,
    ]
  );

  const sendOpportunityShareMessage = useCallback(
    async (receiverId, shareMessage, opportunity) => {
      try {
        const threadId = await db.findOrCreateIndividualMessageThread(
          user.id,
          receiverId
        );

        const opportunityMetadata = {
          type: "opportunity",
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            description: opportunity.description,
            date: opportunity.date,
            time: opportunity.time,
            location: opportunity.location,
            compensation: opportunity.compensation,
            distanceFormatted: opportunity.distanceFormatted,
            genre: opportunity.genre,
          },
        };

        const { error } = await supabase.from("messages").insert({
          thread_id: threadId,
          sender_id: user.id,
          content: shareMessage,
          message_type: "opportunity",
          metadata: opportunityMetadata,
        });

        if (error) throw error;

        setCurrentScreen("messages");
        setScreenParams({
          djId: receiverId,
          chatType: "individual",
          threadId: threadId,
          returnToConnectionsTab: "connections",
        });

        Alert.alert("Sent!", "Opportunity shared successfully!");
      } catch (error) {
        if (__DEV__) console.error("Error sending opportunity share:", error);
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    },
    [user?.id, setCurrentScreen, setScreenParams]
  );

  const handleShareOpportunityInApp = useCallback(
    async (shareMessage, opportunity) => {
      try {
        setCurrentScreen("connections");
        setScreenParams({
          initialTab: "connections",
          shareMode: true,
          shareMessage: shareMessage,
          shareOpportunity: opportunity,
          onShareSelect: async (selectedUserId) => {
            await sendOpportunityShareMessage(
              selectedUserId,
              shareMessage,
              opportunity
            );
          },
        });
      } catch (error) {
        if (__DEV__) console.error("Error initiating in-app share:", error);
        Alert.alert("Error", "Failed to open connections. Please try again.");
      }
    },
    [setCurrentScreen, setScreenParams, sendOpportunityShareMessage]
  );

  const handleSwipeRight = useCallback(async () => {
    if (!dailyApplicationStats.can_apply) {
      Alert.alert(
        "Daily Limit Reached",
        `You have reached your daily limit of ${
          APPLICATION_LIMITS.DAILY_LIMIT
        } applications. You have ${
          dailyApplicationStats?.remaining_applications || 0
        } applications remaining today. Please try again tomorrow.`,
        [{ text: "OK" }]
      );
      return;
    }

    const currentOpportunity = opportunities[currentOpportunityIndex];

    await track(AnalyticsEvents.SWIPE_RIGHT, {
      opportunity_id: currentOpportunity?.id,
      opportunity_title: currentOpportunity?.title,
      opportunity_location: currentOpportunity?.location,
    });
    setSelectedOpportunity(currentOpportunity);

    const applicationsRemainingCount =
      dailyApplicationStats?.remaining_applications || 0;

    showCustomModal({
      type: "info",
      title: currentOpportunity.title,
      message: currentOpportunity.description || "",
      eventDetails: {
        date: currentOpportunity.date,
        time: currentOpportunity.time,
        compensation: currentOpportunity.compensation,
        location: currentOpportunity.location,
        description: currentOpportunity.description,
        distanceFormatted: currentOpportunity.distanceFormatted,
        applicationsRemainingText: `You have ${applicationsRemainingCount} applications remaining today.`,
      },
      primaryButtonText: "Apply Now",
      secondaryButtonText: "Cancel",
      showCloseButton: false,
      showShareButton: true,
      shareOpportunity: currentOpportunity,
      shareUserId: user?.id || null,
      onShareInApp: handleShareOpportunityInApp,
      onPrimaryPress: () => handleConfirmApply(currentOpportunity),
      onSecondaryPress: () => {
        if (__DEV__) console.log("Modal cancelled, advancing to next opportunity.");
        hideCustomModal();
        setSelectedOpportunity(null);
        setCurrentOpportunityIndex((prev) => prev + 1);
      },
    });
  }, [
    dailyApplicationStats,
    opportunities,
    currentOpportunityIndex,
    user?.id,
    showCustomModal,
    hideCustomModal,
    handleConfirmApply,
    handleShareOpportunityInApp,
  ]);

  useEffect(() => {
    let cancelled = false;
    let interactionHandle = null;

    const checkSwipeTutorial = async () => {
      if (
        currentScreen === "opportunities" &&
        user?.id &&
        !isLoadingOpportunities &&
        opportunities.length > 0
      ) {
        try {
          const hasSeenTutorial = await AsyncStorage.getItem(
            "hasSeenSwipeTutorial"
          );
          if (!hasSeenTutorial && !cancelled) {
            interactionHandle = InteractionManager.runAfterInteractions(() => {
              if (!cancelled && isMountedRef.current) {
                setShowSwipeTutorial(true);
              }
            });
          }
        } catch (error) {
          if (__DEV__) console.error("Error checking swipe tutorial:", error);
        }
      }
    };

    checkSwipeTutorial();

    return () => {
      cancelled = true;
      if (interactionHandle && typeof interactionHandle.cancel === "function") {
        interactionHandle.cancel();
      }
    };
  }, [currentScreen, user?.id, isLoadingOpportunities, opportunities.length]);

  useEffect(() => {
    if (currentScreen === "opportunities" && user?.id) {
      const refreshStats = async () => {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          if (!isMountedRef.current) return;
          setDailyApplicationStats(stats);
          setNetworkErrorCount(0);
          if (__DEV__) console.log("Refreshed daily application stats:", stats);
        } catch (error) {
          const isNetworkError =
            error?.message?.includes("Network request failed") ||
            error?.message?.includes("Failed to fetch") ||
            error?.code === "NETWORK_ERROR";

          if (isNetworkError) {
            if (__DEV__) {
              console.warn("Daily stats refresh failed (network):", error?.message);
            }
          } else {
            if (__DEV__) console.error("Error refreshing daily stats:", error);
          }

          if (isNetworkError) {
            setNetworkErrorCount((prevCount) => {
              const newCount = prevCount + 1;
              if (newCount >= 3) {
                if (__DEV__) {
                  console.warn(
                    "Stopping daily stats refresh due to persistent network errors"
                  );
                }
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
              }
              return newCount;
            });
          } else {
            setNetworkErrorCount(0);
          }
        }
      };

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      void refreshStats();

      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          void refreshStats();
        }
      });

      intervalRef.current = setInterval(
        refreshStats,
        DAILY_STATS_REFRESH_INTERVAL_MS
      );

      return () => {
        appStateSub?.remove();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setNetworkErrorCount(0);
      };
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setNetworkErrorCount(0);
    return undefined;
  }, [currentScreen, user?.id]);

  useEffect(() => {
    const opportunitiesChannel = supabase
      .channel("opportunities-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "opportunities",
          filter: "is_active=eq.true",
        },
        (payload) => {
          if (__DEV__) console.log("New opportunity added:", payload.new);
          setOpportunities((prev) =>
            mergeOpportunityFromRealtime(
              prev,
              payload.new,
              userLocationRef.current
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "opportunities",
        },
        (payload) => {
          if (__DEV__) console.log("Opportunity updated:", payload.new);
          setOpportunities((prev) =>
            mergeOpportunityFromRealtime(
              prev,
              payload.new,
              userLocationRef.current
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(opportunitiesChannel);
    };
  }, []);

  return {
    opportunities,
    currentOpportunityIndex,
    dailyApplicationStats,
    isLoadingOpportunities,
    showSwipeTutorial,
    selectedOpportunity,

    fetchOpportunities,
    handleOpportunityPress,
    handleSwipeLeft,
    handleSwipeRight,
    handleDismissSwipeTutorial,
    resetOpportunities,
    refreshOpportunities,
  };
}
