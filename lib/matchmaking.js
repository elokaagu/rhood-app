// R/HOOD Matchmaking System
// Advanced DJ-Opportunity Matching with AI-Powered Recommendations

import { supabase } from "./supabase";

export const matchmaking = {
  // =============================================
  // BRIEF TEMPLATES
  // =============================================

  /**
   * Get all available brief templates
   */
  async getBriefTemplates(category = null) {
    try {
      let query = supabase
        .from("brief_templates")
        .select("*")
        .eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching brief templates:", error);
      throw error;
    }
  },

  /**
   * Generate a brief from a template
   */
  async generateBrief(templateId, variables = {}) {
    try {
      const { data: template, error } = await supabase
        .from("brief_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      // Replace variables in template
      let brief = JSON.parse(JSON.stringify(template.template_data));
      brief = this.replaceTemplateVariables(brief, variables);

      return brief;
    } catch (error) {
      console.error("Error generating brief:", error);
      throw error;
    }
  },

  /**
   * Replace variables in template data
   */
  replaceTemplateVariables(obj, variables) {
    if (typeof obj === "string") {
      return obj.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceTemplateVariables(item, variables));
    } else if (obj && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceTemplateVariables(value, variables);
      }
      return result;
    }
    return obj;
  },

  // =============================================
  // DJ PREFERENCES
  // =============================================

  /**
   * Get DJ preferences for a user
   */
  async getDJPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from("dj_preferences")
        .select("*")
        .eq("user_id", userId)
        .order("preference_type");

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching DJ preferences:", error);
      throw error;
    }
  },

  /**
   * Set DJ preferences
   */
  async setDJPreferences(userId, preferences) {
    try {
      // Delete existing preferences
      await supabase.from("dj_preferences").delete().eq("user_id", userId);

      // Insert new preferences
      const preferencesData = Object.entries(preferences).map(
        ([type, value]) => ({
          user_id: userId,
          preference_type: type,
          preference_value: value,
          importance_score: value.importance || 1.0,
        })
      );

      const { data, error } = await supabase
        .from("dj_preferences")
        .insert(preferencesData)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error setting DJ preferences:", error);
      throw error;
    }
  },

  // =============================================
  // MATCHING ALGORITHM
  // =============================================

  /**
   * Generate matches for a user
   */
  async generateMatches(userId, limit = 20) {
    try {
      const { data, error } = await supabase.rpc("generate_matches_for_user", {
        p_user_id: userId,
      });

      if (error) throw error;

      // Get full opportunity details for matches
      const opportunityIds = data.map((match) => match.opportunity_id);
      const { data: opportunities, error: oppError } = await supabase
        .from("opportunities")
        .select("*")
        .in("id", opportunityIds);

      if (oppError) throw oppError;

      // Combine match scores with opportunity details
      const matches = data.map((match) => {
        const opportunity = opportunities.find(
          (opp) => opp.id === match.opportunity_id
        );
        return {
          ...match,
          opportunity: opportunity,
        };
      });

      return matches.slice(0, limit);
    } catch (error) {
      console.error("Error generating matches:", error);
      throw error;
    }
  },

  /**
   * Calculate match score for a specific opportunity
   */
  async calculateMatchScore(userId, opportunityId) {
    try {
      const { data, error } = await supabase.rpc("calculate_match_score", {
        p_user_id: userId,
        p_opportunity_id: opportunityId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error calculating match score:", error);
      throw error;
    }
  },

  // =============================================
  // MATCHES MANAGEMENT
  // =============================================

  /**
   * Get matches for a user
   */
  async getMatches(userId, status = null, limit = 50) {
    try {
      let query = supabase
        .from("matches")
        .select(
          `
          *,
          opportunity:opportunities(*),
          opportunity_requirements:opportunity_requirements(*)
        `
        )
        .eq("user_id", userId)
        .order("match_score", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching matches:", error);
      throw error;
    }
  },

  /**
   * Update match status
   */
  async updateMatchStatus(matchId, status) {
    try {
      const { data, error } = await supabase
        .from("matches")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", matchId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error updating match status:", error);
      throw error;
    }
  },

  /**
   * Apply to opportunity (creates application)
   */
  async applyToOpportunity(userId, opportunityId, message = "") {
    try {
      // First check if user can apply (hasn't exceeded daily limit)
      const { data: canApply, error: limitError } = await supabase.rpc(
        "check_daily_application_limit",
        {
          user_uuid: userId,
        }
      );

      if (limitError) {
        console.error("Error checking daily limit:", limitError);
        throw new Error("Failed to check application limit");
      }

      if (!canApply) {
        // Get remaining applications count for error message
        const { data: remaining, error: remainingError } = await supabase.rpc(
          "get_remaining_daily_applications",
          {
            user_uuid: userId,
          }
        );

        const remainingCount = remainingError ? 0 : remaining;
        throw new Error(
          `Daily application limit reached. You have ${remainingCount} applications remaining today.`
        );
      }

      // Check if user has already applied to this opportunity
      const { data: existingApplication } = await supabase
        .from("applications")
        .select("id")
        .eq("opportunity_id", opportunityId)
        .eq("user_id", userId)
        .single();

      if (existingApplication) {
        throw new Error("You have already applied to this opportunity");
      }

      // Update match status to applied
      await supabase
        .from("matches")
        .update({ status: "applied" })
        .eq("user_id", userId)
        .eq("opportunity_id", opportunityId);

      // Create application
      const { data, error } = await supabase
        .from("applications")
        .insert({
          user_id: userId,
          opportunity_id: opportunityId,
          status: "pending",
          message: message,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error applying to opportunity:", error);
      throw error;
    }
  },

  // =============================================
  // DJ AVAILABILITY
  // =============================================

  /**
   * Set DJ availability
   */
  async setAvailability(userId, availability) {
    try {
      const { data, error } = await supabase
        .from("dj_availability")
        .insert({
          user_id: userId,
          date_from: availability.date_from,
          date_to: availability.date_to,
          is_available: availability.is_available,
          notes: availability.notes,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error setting availability:", error);
      throw error;
    }
  },

  /**
   * Get DJ availability
   */
  async getAvailability(userId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from("dj_availability")
        .select("*")
        .eq("user_id", userId)
        .order("date_from");

      if (startDate) {
        query = query.gte("date_from", startDate);
      }
      if (endDate) {
        query = query.lte("date_to", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching availability:", error);
      throw error;
    }
  },

  // =============================================
  // VENUE PROFILES
  // =============================================

  /**
   * Get venue profiles
   */
  async getVenues(city = null, venueType = null) {
    try {
      let query = supabase
        .from("venue_profiles")
        .select("*")
        .order("rating", { ascending: false });

      if (city) {
        query = query.eq("city", city);
      }
      if (venueType) {
        query = query.eq("venue_type", venueType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching venues:", error);
      throw error;
    }
  },

  // =============================================
  // PERFORMANCE HISTORY
  // =============================================

  /**
   * Add performance to history
   */
  async addPerformance(userId, performanceData) {
    try {
      const { data, error } = await supabase
        .from("dj_performance_history")
        .insert({
          user_id: userId,
          ...performanceData,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error adding performance:", error);
      throw error;
    }
  },

  /**
   * Get performance history
   */
  async getPerformanceHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from("dj_performance_history")
        .select(
          `
          *,
          opportunity:opportunities(*),
          venue:venue_profiles(*)
        `
        )
        .eq("user_id", userId)
        .order("performance_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching performance history:", error);
      throw error;
    }
  },

  // =============================================
  // MATCH FEEDBACK
  // =============================================

  /**
   * Submit match feedback
   */
  async submitFeedback(matchId, userId, feedback) {
    try {
      const { data, error } = await supabase
        .from("match_feedback")
        .insert({
          match_id: matchId,
          user_id: userId,
          ...feedback,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  },

  // =============================================
  // ANALYTICS
  // =============================================

  /**
   * Get matchmaking analytics for a user
   */
  async getMatchmakingAnalytics(userId) {
    try {
      const [matches, applications, performanceHistory] = await Promise.all([
        this.getMatches(userId),
        supabase.from("applications").select("*").eq("user_id", userId),
        this.getPerformanceHistory(userId, 10),
      ]);

      const analytics = {
        totalMatches: matches.length,
        appliedMatches: matches.filter((m) => m.status === "applied").length,
        pendingApplications:
          applications.data?.filter((a) => a.status === "pending").length || 0,
        acceptedApplications:
          applications.data?.filter((a) => a.status === "accepted").length || 0,
        averageMatchScore:
          matches.length > 0
            ? matches.reduce((sum, m) => sum + m.match_score, 0) /
              matches.length
            : 0,
        recentPerformances: performanceHistory.length,
        averagePerformanceRating:
          performanceHistory.length > 0
            ? performanceHistory.reduce((sum, p) => sum + (p.rating || 0), 0) /
              performanceHistory.length
            : 0,
      };

      return analytics;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }
  },
};

export default matchmaking;
