import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { aiMatchmaking } from "../lib/ai-matchmaking";
import { promptTemplates } from "../lib/ai-prompt-templates";

export default function AIMatchmakingScreen({ userId, onNavigate }) {
  const [aiMatches, setAiMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    apiKey: "",
    provider: "openai", // 'openai' or 'claude'
    scenario: "standardMatching",
    limit: 10,
    includeReasons: true,
    includeConfidence: true,
  });
  const [insights, setInsights] = useState(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    // Load saved AI configuration
    loadAIConfig();
  }, []);

  const loadAIConfig = async () => {
    try {
      // In a real app, load from secure storage
      const savedConfig = await getStoredAIConfig();
      if (savedConfig) {
        setAiConfig(savedConfig);
      }
    } catch (error) {
      console.error("Error loading AI config:", error);
    }
  };

  const getStoredAIConfig = async () => {
    // Mock function - in real app, use secure storage
    return null;
  };

  const saveAIConfig = async (config) => {
    // Mock function - in real app, save to secure storage
    console.log("Saving AI config:", config);
  };

  const generateAIMatches = async () => {
    if (!aiConfig.apiKey) {
      Alert.alert(
        "Configuration Required",
        "Please set your AI API key in settings"
      );
      setShowConfig(true);
      return;
    }

    try {
      setLoading(true);
      const matches = await aiMatchmaking.generateAIMatches(userId, {
        limit: aiConfig.limit,
        includeReasons: aiConfig.includeReasons,
        includeConfidence: aiConfig.includeConfidence,
        scenario: aiConfig.scenario,
      });
      setAiMatches(matches);
    } catch (error) {
      console.error("Error generating AI matches:", error);
      Alert.alert(
        "AI Matching Error",
        error.message || "Failed to generate AI matches"
      );
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!aiConfig.apiKey) {
      Alert.alert(
        "Configuration Required",
        "Please set your AI API key in settings"
      );
      return;
    }

    try {
      setLoading(true);
      const aiInsights = await aiMatchmaking.generateInsights(
        userId,
        aiConfig.apiKey,
        aiConfig.provider
      );
      setInsights(aiInsights);
      setShowInsights(true);
    } catch (error) {
      console.error("Error generating insights:", error);
      Alert.alert(
        "Insights Error",
        error.message || "Failed to generate AI insights"
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await generateAIMatches();
    setRefreshing(false);
  };

  const handleApply = async (match) => {
    try {
      // Use the existing matchmaking system to apply
      const { matchmaking } = await import("../lib/matchmaking");
      await matchmaking.applyToOpportunity(userId, match.opportunity_id);
      Alert.alert("Success", "Application submitted successfully!");
      // Refresh matches
      generateAIMatches();
    } catch (error) {
      console.error("Error applying:", error);
      Alert.alert("Error", "Failed to submit application");
    }
  };

  const handlePass = async (match) => {
    try {
      const { matchmaking } = await import("../lib/matchmaking");
      await matchmaking.updateMatchStatus(match.id, "rejected");
      setAiMatches(aiMatches.filter((m) => m.id !== match.id));
    } catch (error) {
      console.error("Error passing on match:", error);
      Alert.alert("Error", "Failed to update match status");
    }
  };

  const updateAIConfig = (updates) => {
    const newConfig = { ...aiConfig, ...updates };
    setAiConfig(newConfig);
    saveAIConfig(newConfig);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMatchScoreColor = (score) => {
    if (score >= 85) return "hsl(120, 100%, 50%)"; // Green
    if (score >= 70) return "hsl(60, 100%, 50%)"; // Yellow
    if (score >= 50) return "hsl(30, 100%, 50%)"; // Orange
    return "hsl(0, 100%, 50%)"; // Red
  };

  const getMatchTypeColor = (type) => {
    const colors = {
      perfect_fit: "hsl(120, 100%, 50%)",
      good_fit: "hsl(60, 100%, 50%)",
      interesting_opportunity: "hsl(200, 100%, 50%)",
      stretch_goal: "hsl(280, 100%, 50%)",
      algorithmic_fallback: "hsl(0, 0%, 50%)",
    };
    return colors[type] || "hsl(0, 0%, 50%)";
  };

  const renderAIMatchCard = (match) => (
    <View key={match.opportunity_id} style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.matchScoreContainer}>
          <Text
            style={[
              styles.matchScore,
              { color: getMatchScoreColor(match.compatibility_score) },
            ]}
          >
            {match.compatibility_score}%
          </Text>
          <Text style={styles.matchScoreLabel}>AI Match</Text>
        </View>
        <View style={styles.matchTypeContainer}>
          <Text
            style={[
              styles.matchType,
              { color: getMatchTypeColor(match.match_type) },
            ]}
          >
            {match.match_type.replace("_", " ").toUpperCase()}
          </Text>
          {match.confidence && (
            <Text style={styles.confidenceText}>
              {Math.round(match.confidence * 100)}% confidence
            </Text>
          )}
        </View>
      </View>

      <View style={styles.opportunityInfo}>
        <Text style={styles.opportunityTitle}>{match.opportunity?.title}</Text>
        <Text style={styles.opportunityDescription}>
          {match.opportunity?.description}
        </Text>

        <View style={styles.opportunityDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>
              {formatDate(match.opportunity?.event_date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>{match.opportunity?.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="musical-notes-outline"
              size={16}
              color="hsl(0, 0%, 70%)"
            />
            <Text style={styles.detailText}>{match.opportunity?.genre}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="hsl(0, 0%, 70%)" />
            <Text style={styles.detailText}>${match.opportunity?.payment}</Text>
          </View>
        </View>

        {match.reasoning && (
          <View style={styles.aiReasoning}>
            <Text style={styles.reasoningTitle}>AI Analysis:</Text>
            <Text style={styles.reasoningText}>{match.reasoning}</Text>
          </View>
        )}

        {match.strengths && match.strengths.length > 0 && (
          <View style={styles.strengthsContainer}>
            <Text style={styles.strengthsTitle}>Key Strengths:</Text>
            {match.strengths.map((strength, index) => (
              <Text key={index} style={styles.strengthText}>
                • {strength}
              </Text>
            ))}
          </View>
        )}

        {match.considerations && match.considerations.length > 0 && (
          <View style={styles.considerationsContainer}>
            <Text style={styles.considerationsTitle}>Considerations:</Text>
            {match.considerations.map((consideration, index) => (
              <Text key={index} style={styles.considerationText}>
                • {consideration}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.matchActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handlePass(match)}
        >
          <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
          <Text style={styles.actionButtonText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.applyButton]}
          onPress={() => handleApply(match)}
        >
          <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 0%)" />
          <Text style={[styles.actionButtonText, styles.applyButtonText]}>
            Apply
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConfigModal = () => (
    <Modal
      visible={showConfig}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowConfig(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Configuration</Text>
            <TouchableOpacity onPress={() => setShowConfig(false)}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.configForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AI Provider</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    aiConfig.provider === "openai" && styles.radioSelected,
                  ]}
                  onPress={() => updateAIConfig({ provider: "openai" })}
                >
                  <Text style={styles.radioText}>OpenAI (GPT-4)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    aiConfig.provider === "claude" && styles.radioSelected,
                  ]}
                  onPress={() => updateAIConfig({ provider: "claude" })}
                >
                  <Text style={styles.radioText}>Claude (Anthropic)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.textInput}
                value={aiConfig.apiKey}
                onChangeText={(text) => updateAIConfig({ apiKey: text })}
                placeholder="Enter your API key"
                placeholderTextColor="hsl(0, 0%, 50%)"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Matching Scenario</Text>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>
                  {aiConfig.scenario.replace(/([A-Z])/g, " $1").trim()}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Matches</Text>
              <TextInput
                style={styles.textInput}
                value={aiConfig.limit.toString()}
                onChangeText={(text) =>
                  updateAIConfig({ limit: parseInt(text) || 10 })
                }
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="hsl(0, 0%, 50%)"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowConfig(false)}
            >
              <Text style={styles.saveButtonText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderInsightsModal = () => (
    <Modal
      visible={showInsights}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowInsights(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Career Insights</Text>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.insightsContent}>
            {insights && (
              <View>
                <Text style={styles.insightsText}>
                  {JSON.stringify(insights, null, 2)}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Matchmaking</Text>
        <Text style={styles.subtitle}>
          Intelligent DJ-opportunity matching powered by AI
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setShowConfig(true)}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.insightsButton}
            onPress={generateInsights}
            disabled={loading}
          >
            <Ionicons
              name="analytics-outline"
              size={20}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
            <Text style={styles.loadingText}>
              AI is analyzing your profile...
            </Text>
          </View>
        ) : aiMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="sparkles-outline"
              size={64}
              color="hsl(0, 0%, 50%)"
            />
            <Text style={styles.emptyStateTitle}>Ready for AI Matching</Text>
            <Text style={styles.emptyStateText}>
              Tap the button below to generate intelligent matches using AI
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateAIMatches}
            >
              <Ionicons name="sparkles" size={20} color="hsl(0, 0%, 0%)" />
              <Text style={styles.generateButtonText}>Generate AI Matches</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.matchesContainer}>
            {aiMatches.map(renderAIMatchCard)}
          </View>
        )}
      </ScrollView>

      {renderConfigModal()}
      {renderInsightsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: "hsl(0, 0%, 5%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  title: {
    fontSize: 28,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  configButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  insightsButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    padding: 12,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Helvetica Neue",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  matchesContainer: {
    padding: 20,
  },
  matchCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  matchScoreContainer: {
    alignItems: "center",
  },
  matchScore: {
    fontSize: 32,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
  },
  matchScoreLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginTop: -4,
  },
  matchTypeContainer: {
    alignItems: "flex-end",
  },
  matchType: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    marginTop: 2,
  },
  opportunityInfo: {
    marginBottom: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    marginBottom: 16,
  },
  opportunityDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  aiReasoning: {
    backgroundColor: "hsl(0, 0%, 10%)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasoningTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 18,
  },
  strengthsContainer: {
    marginBottom: 12,
  },
  strengthsTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(120, 100%, 50%)",
    marginBottom: 6,
  },
  strengthText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    marginBottom: 2,
  },
  considerationsContainer: {
    marginBottom: 16,
  },
  considerationsTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(30, 100%, 50%)",
    marginBottom: 6,
  },
  considerationText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 2,
  },
  matchActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  passButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  applyButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  applyButtonText: {
    color: "hsl(0, 0%, 0%)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
  },
  configForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    backgroundColor: "hsl(0, 0%, 10%)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  radioSelected: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  radioText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  dropdown: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  saveButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  insightsContent: {
    padding: 20,
  },
  insightsText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 20,
  },
});
