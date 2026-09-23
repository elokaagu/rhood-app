import { useCallback, useEffect, useState } from "react";
import { generateGenreWaveform } from "../lib/audioWaveform";
import { createScreenCache } from "../lib/screenCache";
import {
  buildProfileViewModel,
  extractDurationSeconds,
  mapGigsForProfile,
  mixToAudioId,
  normalizeProfileForUI,
  splitProfileOpportunityActivity,
} from "../lib/profileScreen/model";

const profileCache = createScreenCache("profile", { userScoped: true });

const EMPTY_REFERRALS = { totalReferrals: 0, totalCreditsEarned: 0 };

async function resolvePrimaryMix(userProfile, db, supabase) {
  if (userProfile.primary_mix_id) {
    const { data: mixData, error: mixError } = await supabase
      .from("mixes")
      .select("*")
      .eq("id", userProfile.primary_mix_id)
      .single();

    if (mixError) {
      if (mixError.code === "PGRST116" || mixError.message?.includes("No rows")) {
        try {
          await db.setPrimaryMix(userProfile.id, null);
        } catch (_clearError) {
          /* non-fatal */
        }
      }
      return null;
    }
    if (!mixData) return null;
    const durationSeconds = extractDurationSeconds(mixData);
    const waveform = generateGenreWaveform(
      durationSeconds || 300,
      mixData.genre || "electronic",
      16
    );
    return mixToAudioId(mixData, userProfile, waveform);
  }

  const { data: userMixes, error: mixesError } = await supabase
    .from("mixes")
    .select("*")
    .eq("user_id", userProfile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (mixesError || !userMixes?.length) return null;

  const mostRecentMix = userMixes[0];
  try {
    await db.setPrimaryMix(userProfile.id, mostRecentMix.id);
  } catch (_autoSetError) {
    return null;
  }

  const { data: mixData } = await supabase
    .from("mixes")
    .select("*")
    .eq("id", mostRecentMix.id)
    .single();
  if (!mixData) return null;
  const durationSeconds = extractDurationSeconds(mixData);
  const waveform = generateGenreWaveform(
    durationSeconds || 300,
    mixData.genre || "electronic",
    16
  );
  return mixToAudioId(mixData, userProfile, waveform);
}

export function useProfileScreenData(user) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [inviteCode, setInviteCode] = useState(null);
  const [referralStats, setReferralStats] = useState(EMPTY_REFERRALS);
  const [bookingRequests, setBookingRequests] = useState([]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { db, supabase } = await import("../lib/supabase");
      const userProfile = await db.getUserProfile(user.id);

      let recentGigs = [];
      let recentOpportunities = [];
      let gigsCompletedOverride = null;
      try {
        const activity = await db.getProfileActivity(user.id);
        const split = splitProfileOpportunityActivity(
          activity.applications,
          activity.ratingsByApplicationId
        );
        recentOpportunities = split.recentOpportunities;
        recentGigs = split.recentGigs;
        gigsCompletedOverride = split.gigsCompleted;
        if (!recentGigs.length) {
          const legacyGigs = await db.getUserGigs(user.id).catch(() => []);
          const completedLegacy = (legacyGigs || []).filter(
            (gig) => String(gig.status || "").toLowerCase() === "completed"
          );
          if (completedLegacy.length) {
            recentGigs = mapGigsForProfile(completedLegacy);
            if (!gigsCompletedOverride) {
              gigsCompletedOverride = completedLegacy.length;
            }
          }
        }
      } catch (gigsError) {
        if (__DEV__) console.error("Error loading profile activity:", gigsError);
      }

      let achievements = [];
      let achievementsStats = { earnedCount: 0, totalCount: 0 };
      let creditsValue = Number(userProfile?.credits ?? 0);
      let connections = 0;
      let userInviteCode = null;
      let userReferralStats = EMPTY_REFERRALS;
      let incomingBookings = [];

      try {
        const [
          allAchievements,
          userAchievements,
          fetchedCredits,
          connectionsData,
          fetchedInviteCode,
          fetchedReferralStats,
          fetchedBookingRequests,
        ] = await Promise.all([
          db.getAchievements(),
          db.getUserAchievements(user.id),
          db.getUserCredits(user.id),
          db.getUserConnections(user.id, "accepted"),
          db.getUserInviteCode(user.id),
          db.getReferralStats(user.id),
          db.getIncomingBookingRequests(user.id),
        ]);

        connections = connectionsData?.length || 0;
        userInviteCode = fetchedInviteCode;
        userReferralStats = fetchedReferralStats || EMPTY_REFERRALS;
        incomingBookings = Array.isArray(fetchedBookingRequests)
          ? fetchedBookingRequests
          : [];

        if (allAchievements?.length) {
          const earnedIds = new Set(
            (userAchievements || []).map((ua) => ua.achievement_id)
          );
          achievementsStats.totalCount = allAchievements.length;
          achievementsStats.earnedCount = allAchievements.filter((achievement) =>
            earnedIds.has(achievement.id)
          ).length;
          achievements = allAchievements.slice(0, 4).map((achievement) => ({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon || "trophy",
            earned: earnedIds.has(achievement.id),
          }));
        }

        if (Number.isFinite(fetchedCredits)) {
          creditsValue = fetchedCredits;
        }
        setConnectionsCount(connections);
        setInviteCode(userInviteCode);
        setReferralStats(userReferralStats);
        setBookingRequests(incomingBookings);
      } catch (achievementsError) {
        if (__DEV__) console.error("Error loading achievements:", achievementsError);
      }

      if (userProfile) {
        const primaryMix = await resolvePrimaryMix(userProfile, db, supabase);
        const profileData = buildProfileViewModel({
          userProfile,
          recentGigs,
          recentOpportunities,
          achievements,
          achievementsStats,
          creditsValue,
          primaryMix,
          gigsCompletedOverride,
        });
        setProfile(profileData);
        profileCache.set(user.id, {
          profile: profileData,
          connectionsCount: connections,
          inviteCode: userInviteCode,
          referralStats: userReferralStats,
          bookingRequests: incomingBookings,
        });
      }
    } catch (error) {
      if (__DEV__) console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (userId) {
      const cached = profileCache.getIfFresh(userId);
      if (cached?.profile) {
        setProfile(normalizeProfileForUI(cached.profile));
        setConnectionsCount(cached.connectionsCount ?? 0);
        setInviteCode(cached.inviteCode ?? null);
        setReferralStats(cached.referralStats ?? EMPTY_REFERRALS);
        setBookingRequests(cached.bookingRequests ?? []);
        setLoading(false);
      } else {
        loadProfile();
      }
    } else {
      loadProfile();
    }

    if (!userId) return undefined;

    let subscription = null;
    let isMounted = true;

    (async () => {
      const { supabase } = await import("../lib/supabase");
      subscription = supabase
        .channel(`profile_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_profiles",
            filter: `id=eq.${userId}`,
          },
          () => {
            if (isMounted) loadProfile();
          }
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [user?.id, loadProfile]);

  return {
    profile,
    loading,
    connectionsCount,
    inviteCode,
    referralStats,
    bookingRequests,
    reload: loadProfile,
  };
}
