import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { db, supabase } from "../lib/supabase";
import { APPLICATION_LIMITS } from "../lib/performanceConstants";
import {
  calculateDistance,
  formatDistance,
} from "../lib/locationService";
import {
  track,
  AnalyticsEvents,
} from "../lib/analytics";
import {
  formatOpportunityDate,
  formatOpportunityTime,
  formatOpportunityCompensation,
} from "../lib/formatters";

/**
 * Hook that owns all opportunity-related state, data fetching,
 * swipe handling, application logic, and real-time subscriptions.
 */
export default function useOpportunities({
  user,
  currentScreen,
  userLocation,
  showCustomModal,
  hideCustomModal,
  setCurrentScreen,
  setScreenParams,
}) {
  // ── State ──────────────────────────────────────────────
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

  // ── Refs ───────────────────────────────────────────────
  const intervalRef = useRef(null);

  // ── Fetch opportunities from Supabase ──────────────────
  const fetchOpportunities = useCallback(async () => {
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
        setOpportunities([]);
        return;
      }

      if (__DEV__) console.log(`Fetched ${opportunitiesData.length} opportunities from database`);

      const transformedOpportunities = opportunitiesData.map((opp) => {
        const formattedDate = formatOpportunityDate(opp.event_date);
        let startTimeRaw =
          opp.event_start_time ??
          opp.start_time ??
          opp.event_time ??
          opp.event_date ??
          null;
        let endTimeRaw =
          opp.event_end_time ?? opp.event_time_end ?? opp.end_time ?? null;

        if (!endTimeRaw && typeof startTimeRaw === "string") {
          const timeRangeParts = startTimeRaw
            .split(/\s*(?:-|–|to)\s*/i)
            .map((part) => part.trim())
            .filter(Boolean);

          if (timeRangeParts.length === 2) {
            startTimeRaw = timeRangeParts[0] || startTimeRaw;
            endTimeRaw = timeRangeParts[1] || endTimeRaw;
          }
        }

        const formattedTime = formatOpportunityTime(startTimeRaw, endTimeRaw);
        const formattedCompensation = formatOpportunityCompensation(
          opp.payment,
          opp.payment_currency,
          opp.payment_max ?? opp.max_payment ?? null
        );
        const paymentValue =
          typeof opp.payment === "string"
            ? parseFloat(opp.payment)
            : Number(opp.payment);
        const resolvedLocation =
          opp.location ||
          [opp.city, opp.country].filter(Boolean).join(", ") ||
          "Location not set";
        const createdAt = opp.created_at ? new Date(opp.created_at) : null;
        const isNew =
          createdAt &&
          createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Calculate distance if user location is available
        let distance = null;
        let distanceFormatted = null;
        if (userLocation && opp.latitude && opp.longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            opp.latitude,
            opp.longitude
          );
          distanceFormatted = formatDistance(distance);
        }

        return {
          id: opp.id,
          venue: opp.venue || "",
          title: opp.title,
          location: resolvedLocation,
          distance,
          distanceFormatted,
          date: formattedDate,
          rawDate: opp.event_date,
          time: formattedTime,
          rawTime: startTimeRaw,
          rawTimeEnd: endTimeRaw,
          audienceSize: opp.audience_size || "TBD",
          description: opp.description,
          genres: opp.genre ? [opp.genre] : ["Electronic"],
          compensation: formattedCompensation,
          paymentValue: Number.isFinite(paymentValue) ? paymentValue : null,
          paymentCurrency: opp.payment_currency
            ? opp.payment_currency.toUpperCase()
            : "GBP",
          applicationsLeft: 0,
          status: isNew ? "new" : "hot",
          image:
            opp.image_url ||
            (opp.genre === "Techno"
              ? "https://images.unsplash.com/photo-1571266028243-e68f8570c0e8?w=400&h=400&fit=crop"
              : opp.genre === "House"
              ? "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop"
              : opp.genre === "Electronic"
              ? "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
              : "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"),
        };
      });

      setOpportunities(transformedOpportunities);

      // Load daily application stats
      if (user?.id) {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          setDailyApplicationStats(stats);
          if (__DEV__) console.log("User daily application stats:", stats);
        } catch (statsError) {
          if (__DEV__) console.error("Error loading daily stats:", statsError);
          setDailyApplicationStats({
            daily_count: 0,
            remaining_applications: 5,
            can_apply: true,
          });
        }
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching opportunities:", error);
      setOpportunities([]);
    } finally {
      setIsLoadingOpportunities(false);
    }
  }, [user?.id, userLocation]);

  // ── Swipe / apply handlers ─────────────────────────────

  const handleOpportunityPress = useCallback((opportunity) => {
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
  }, [showCustomModal]);

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

  // ── Confirm apply ──────────────────────────────────────

  const handleConfirmApply = useCallback(async (opportunity) => {
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

      // Refresh daily stats
      try {
        const updatedStats = await db.getUserDailyApplicationStats(user.id);
        setDailyApplicationStats(updatedStats);
        if (__DEV__) console.log("Updated daily application stats:", updatedStats);
      } catch (statsError) {
        if (__DEV__) console.error("Error refreshing daily stats:", statsError);
      }

      setSwipedOpportunities((prev) => [
        ...prev,
        { ...opportunity, action: "applied" },
      ]);
      setCurrentOpportunityIndex((prev) => prev + 1);

      // Show success message
      setTimeout(async () => {
        let updatedRemaining = 0;
        try {
          const freshStats = await db.getUserDailyApplicationStats(user.id);
          updatedRemaining = freshStats?.remaining_applications || 0;
        } catch (error) {
          if (__DEV__) console.error("Error getting fresh stats:", error);
        }

        let userCredits = 0;
        try {
          const userProfile = await db.getUserProfile(user.id);
          userCredits = userProfile?.credits || 0;
        } catch (error) {
          if (__DEV__) console.error("Error getting user credits:", error);
        }

        const canBoost = userCredits >= 10 && applicationId;
        const boostMessage = canBoost
          ? `\n\n💡 Boost your application to the top for 24 hours (10 credits)`
          : applicationId
          ? `\n\n💡 Boost your application to the top for 24 hours (requires 10 credits)`
          : "";

        showCustomModal({
          type: "success",
          title: "Application Sent!",
          message: `Your application for ${opportunity.title} has been sent successfully. You have ${updatedRemaining} applications remaining today.${boostMessage}`,
          primaryButtonText: canBoost ? "Boost" : "OK",
          secondaryButtonText: canBoost ? "Skip" : undefined,
          onPrimaryPress: canBoost && applicationId
            ? async () => {
                try {
                  hideCustomModal();
                  await db.boostApplication(applicationId, 24, 10);
                  const updatedProfile = await db.getUserProfile(user.id);
                  showCustomModal({
                    type: "success",
                    title: "Application Boosted!",
                    message: `Your application has been boosted to the top of the list for 24 hours. You now have ${updatedProfile?.credits || 0} credits remaining.`,
                    primaryButtonText: "OK",
                  });
                } catch (boostError) {
                  if (__DEV__) console.error("Error boosting:", boostError);
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
      }, 300);
    } catch (error) {
      const errorMessage = error?.message || "";
      const isDailyLimitError = errorMessage.includes("Daily application limit");
      const isAlreadyAppliedError = errorMessage.includes("already applied");
      const isMissingMixError = errorMessage.includes("upload at least one mix");

      if (isDailyLimitError || isAlreadyAppliedError || isMissingMixError) {
        if (__DEV__) console.warn("Application handled error:", errorMessage);
      } else {
        if (__DEV__) console.error("Unexpected application error:", error);
      }

      if (isDailyLimitError) {
        showCustomModal({
          type: "warning",
          title: "Daily Limit Reached",
          message: errorMessage,
          primaryButtonText: "OK",
        });
        return;
      }

      if (isAlreadyAppliedError) {
        showCustomModal({
          type: "info",
          title: "Already Applied",
          message:
            "You've already applied for this opportunity. We'll notify you on the outcome soon.",
          primaryButtonText: "OK",
          onPrimaryPress: () => {
            setCurrentOpportunityIndex((prev) => prev + 1);
            setSelectedOpportunity(null);
          },
        });
        return;
      }

      if (isMissingMixError) {
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
    } finally {
      setSelectedOpportunity(null);
    }
  }, [user?.id, showCustomModal, hideCustomModal, setCurrentScreen]);

  // ── Share opportunity in-app ───────────────────────────

  const sendOpportunityShareMessage = useCallback(async (
    receiverId,
    shareMessage,
    opportunity
  ) => {
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
  }, [user?.id, setCurrentScreen, setScreenParams]);

  const handleShareOpportunityInApp = useCallback(async (shareMessage, opportunity) => {
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
  }, [setCurrentScreen, setScreenParams, sendOpportunityShareMessage]);

  // ── Swipe right (shows detail modal) ───────────────────

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
    handleConfirmApply,
    handleShareOpportunityInApp,
  ]);

  // ── Effects ────────────────────────────────────────────

  // Initial fetch on mount
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Check if swipe tutorial should be shown
  useEffect(() => {
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
          if (!hasSeenTutorial) {
            setTimeout(() => {
              setShowSwipeTutorial(true);
            }, 500);
          }
        } catch (error) {
          if (__DEV__) console.error("Error checking swipe tutorial:", error);
        }
      }
    };
    checkSwipeTutorial();
  }, [currentScreen, user?.id, isLoadingOpportunities, opportunities.length]);

  // Refresh daily application stats when on opportunities screen
  useEffect(() => {
    if (currentScreen === "opportunities" && user?.id) {
      const refreshStats = async () => {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          setDailyApplicationStats(stats);
          setNetworkErrorCount(0);
          if (__DEV__) console.log("Refreshed daily application stats:", stats);
        } catch (error) {
          const isNetworkError =
            error?.message?.includes("Network request failed") ||
            error?.message?.includes("Failed to fetch") ||
            error?.code === "NETWORK_ERROR";

          if (isNetworkError) {
            if (__DEV__) console.warn("Daily stats refresh failed (network):", error?.message);
          } else {
            if (__DEV__) console.error("Error refreshing daily stats:", error);
          }

          if (isNetworkError) {
            setNetworkErrorCount((prevCount) => {
              const newCount = prevCount + 1;
              if (newCount >= 3) {
                if (__DEV__) console.warn("Stopping daily stats refresh due to persistent network errors");
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

      refreshStats();
      intervalRef.current = setInterval(refreshStats, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setNetworkErrorCount(0);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setNetworkErrorCount(0);
    }
  }, [currentScreen, user?.id]);

  // Real-time opportunity updates
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
          fetchOpportunities();
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
          fetchOpportunities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(opportunitiesChannel);
    };
  }, [fetchOpportunities]);

  // ── Return ─────────────────────────────────────────────

  return {
    // State
    opportunities,
    currentOpportunityIndex,
    dailyApplicationStats,
    isLoadingOpportunities,
    showSwipeTutorial,
    selectedOpportunity,

    // Actions
    fetchOpportunities,
    handleOpportunityPress,
    handleSwipeLeft,
    handleSwipeRight,
    handleDismissSwipeTutorial,
    resetOpportunities,
    refreshOpportunities,
  };
}
