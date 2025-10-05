import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/supabase";

const OpportunitiesContext = createContext();

export const useOpportunities = () => {
  const context = useContext(OpportunitiesContext);
  if (!context) {
    throw new Error(
      "useOpportunities must be used within an OpportunitiesProvider"
    );
  }
  return context;
};

export const OpportunitiesProvider = ({ children }) => {
  // Opportunities state
  const [opportunities, setOpportunities] = useState([]);
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [swipedOpportunities, setSwipedOpportunities] = useState([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);

  // Application state
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isSubmittingBrief, setIsSubmittingBrief] = useState(false);

  // Fetch opportunities from Supabase
  const fetchOpportunities = async () => {
    try {
      console.log("📋 Fetching opportunities...");
      setIsLoadingOpportunities(true);

      const data = await db.getOpportunities();
      setOpportunities(data);
      setCurrentOpportunityIndex(0);
      console.log(`✅ Loaded ${data.length} opportunities`);
    } catch (error) {
      console.error("❌ Error fetching opportunities:", error);
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  // Load opportunities on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Get current opportunity
  const getCurrentOpportunity = () => {
    if (opportunities.length === 0) return null;
    return opportunities[currentOpportunityIndex];
  };

  // Get next opportunity
  const getNextOpportunity = () => {
    if (currentOpportunityIndex < opportunities.length - 1) {
      return opportunities[currentOpportunityIndex + 1];
    }
    return null;
  };

  // Swipe right (apply)
  const handleSwipeRight = async (opportunity) => {
    try {
      console.log("👍 Swiping right on:", opportunity.title);

      setIsSubmittingApplication(true);

      // Submit application
      await db.applyToOpportunity(opportunity.id, opportunity.user_id);

      // Add to swiped opportunities
      setSwipedOpportunities((prev) => [
        ...prev,
        { ...opportunity, action: "applied" },
      ]);

      // Move to next opportunity
      if (currentOpportunityIndex < opportunities.length - 1) {
        setCurrentOpportunityIndex((prev) => prev + 1);
      } else {
        // No more opportunities
        console.log("📭 No more opportunities");
      }
    } catch (error) {
      console.error("❌ Error submitting application:", error);
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  // Swipe left (pass)
  const handleSwipeLeft = (opportunity) => {
    console.log("👎 Swiping left on:", opportunity.title);

    // Add to swiped opportunities
    setSwipedOpportunities((prev) => [
      ...prev,
      { ...opportunity, action: "passed" },
    ]);

    // Move to next opportunity
    if (currentOpportunityIndex < opportunities.length - 1) {
      setCurrentOpportunityIndex((prev) => prev + 1);
    } else {
      // No more opportunities
      console.log("📭 No more opportunities");
    }
  };

  // Show brief form
  const showBriefFormModal = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowBriefForm(true);
  };

  // Close brief form
  const closeBriefForm = () => {
    setShowBriefForm(false);
    setSelectedOpportunity(null);
  };

  // Submit brief
  const handleBriefSubmit = async (briefData) => {
    try {
      console.log("📝 Submitting brief for:", selectedOpportunity.title);

      setIsSubmittingBrief(true);

      // Here you would submit the brief data
      // await db.submitBrief(selectedOpportunity.id, briefData);

      console.log("✅ Brief submitted successfully");
      closeBriefForm();

      // Also apply to the opportunity
      await handleSwipeRight(selectedOpportunity);
    } catch (error) {
      console.error("❌ Error submitting brief:", error);
    } finally {
      setIsSubmittingBrief(false);
    }
  };

  // Reset opportunities (for testing/development)
  const resetOpportunities = () => {
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
    fetchOpportunities();
  };

  const value = {
    // State
    opportunities,
    currentOpportunityIndex,
    swipedOpportunities,
    isLoadingOpportunities,
    isSubmittingApplication,
    showBriefForm,
    selectedOpportunity,
    isSubmittingBrief,

    // Computed values
    currentOpportunity: getCurrentOpportunity(),
    nextOpportunity: getNextOpportunity(),

    // Actions
    fetchOpportunities,
    handleSwipeRight,
    handleSwipeLeft,
    showBriefFormModal,
    closeBriefForm,
    handleBriefSubmit,
    resetOpportunities,
    setCurrentOpportunityIndex,
  };

  return (
    <OpportunitiesContext.Provider value={value}>
      {children}
    </OpportunitiesContext.Provider>
  );
};
