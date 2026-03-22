import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { aiMatchmaking } from "../lib/ai-matchmaking";
import { supabase } from "../lib/supabase";
import {
  loadAiMatchmakingConfig,
  saveAiMatchmakingConfig,
} from "../lib/aiMatchmakingConfigStorage";

const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

const MATCH_SCENARIOS = [
  { value: "standardMatching", label: "Standard matching" },
  { value: "genreFocus", label: "Genre & style focus" },
  { value: "careerGrowth", label: "Career growth" },
  { value: "localOpportunities", label: "Local opportunities" },
  { value: "stretchGoals", label: "Stretch goals" },
];

function clampLimit(n) {
  if (!Number.isFinite(n)) return 10;
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.round(n)));
}

function formatMatchTypeLabel(type) {
  return (type || "match").replace(/_/g, " ").toUpperCase();
}

function formatPayment(payment) {
  if (payment == null || payment === "") return "Not specified";
  const n = Number(String(payment).replace(/[^0-9.]/g, ""));
  if (Number.isFinite(n) && n >= 0) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `$${n}`;
    }
  }
  return String(payment);
}

function formatOpportunityDate(dateString) {
  if (!dateString) return "TBD";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "TBD";

    const day = date.getDate();
    const month = date.toLocaleDateString(undefined, { month: "long" });
    const year = date.getFullYear();

    const getOrdinalSuffix = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  } catch {
    return "TBD";
  }
}

function getMatchScoreColor(score) {
  if (score >= 85) return "hsl(120, 100%, 50%)";
  if (score >= 70) return "hsl(48, 85%, 55%)";
  if (score >= 50) return "hsl(30, 100%, 50%)";
  return "hsl(0, 100%, 50%)";
}

function getMatchTypeColor(type) {
  const colors = {
    perfect_fit: "hsl(120, 100%, 50%)",
    good_fit: "hsl(48, 85%, 55%)",
    interesting_opportunity: "hsl(200, 100%, 50%)",
    stretch_goal: "hsl(280, 100%, 50%)",
    algorithmic_fallback: "hsl(0, 0%, 50%)",
  };
  return colors[type] || "hsl(0, 0%, 50%)";
}

function normalizeStringArray(val) {
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  }
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

/**
 * Present AI insights as product UI instead of raw JSON.
 */
function InsightsContent({ insights }) {
  if (!insights || typeof insights !== "object") {
    return (
      <Text style={styles.insightsFallbackText}>No insights available.</Text>
    );
  }

  if (insights.error) {
    return (
      <Text style={styles.insightsFallbackText}>
        {String(insights.error)}
      </Text>
    );
  }

  const blocks = [];

  const addParagraph = (title, text) => {
    if (text == null || text === "") return;
    blocks.push({ type: "paragraph", title, text: String(text) });
  };

  const addList = (title, items) => {
    const list = normalizeStringArray(items);
    if (!list.length) return;
    blocks.push({ type: "list", title, items: list });
  };

  if (typeof insights.summary === "string") {
    addParagraph("Summary", insights.summary);
  } else if (insights.summary && typeof insights.summary === "object") {
    addParagraph(
      "Summary",
      insights.summary.overview ||
        insights.summary.text ||
        JSON.stringify(insights.summary, null, 2)
    );
  }

  addList("Career trajectory", insights.career_trajectory);
  addList("Top strengths", insights.strengths || insights.key_strengths);
  addList(
    "Improvement areas",
    insights.improvement_areas ||
      insights.skill_development_areas ||
      insights.development_areas
  );
  addList(
    "Recommended next steps",
    insights.recommended_actions ||
      insights.recommendations ||
      insights.next_steps
  );
  addList("Market insights", insights.market_insights || insights.insights);

  if (blocks.length === 0) {
    const skip = new Set([
      "matches",
      "error",
      "summary",
      "strengths",
      "key_strengths",
      "improvement_areas",
      "skill_development_areas",
      "development_areas",
      "recommended_actions",
      "recommendations",
      "next_steps",
      "market_insights",
      "insights",
      "career_trajectory",
    ]);
    const entries = Object.entries(insights).filter(
      ([k, v]) => !skip.has(k) && v != null && v !== ""
    );
    if (entries.length === 0) {
      return (
        <Text style={styles.insightsFallbackText}>
          Insights were returned in an unexpected shape.
        </Text>
      );
    }
    return (
      <View>
        {entries.map(([key, val]) => (
          <View key={key} style={styles.insightSection}>
            <Text style={styles.insightSectionTitle}>
              {key.replace(/_/g, " ")}
            </Text>
            <Text style={styles.insightBodyText}>
              {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {blocks.map((b, i) =>
        b.type === "paragraph" ? (
          <View key={`p-${i}`} style={styles.insightSection}>
            <Text style={styles.insightSectionTitle}>{b.title}</Text>
            <Text style={styles.insightBodyText}>{b.text}</Text>
          </View>
        ) : (
          <View key={`l-${i}`} style={styles.insightSection}>
            <Text style={styles.insightSectionTitle}>{b.title}</Text>
            {b.items.map((line, j) => (
              <Text key={j} style={styles.insightBullet}>
                • {line}
              </Text>
            ))}
          </View>
        )
      )}
    </View>
  );
}

export default function AIMatchmakingScreen({ userId, onNavigate }) {
  const [aiMatches, setAiMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    apiKey: "",
    provider: "openai",
    scenario: "standardMatching",
    limit: 10,
    includeReasons: true,
    includeConfidence: true,
  });
  const [configDraft, setConfigDraft] = useState(null);
  const [insights, setInsights] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [scenarioPickerOpen, setScenarioPickerOpen] = useState(false);
  const [cardAction, setCardAction] = useState(null);

  const openConfigModal = useCallback(() => {
    setConfigDraft({ ...aiConfig });
    setShowConfig(true);
  }, [aiConfig]);

  const loadAIConfig = useCallback(async () => {
    if (!userId) return;
    try {
      const saved = await loadAiMatchmakingConfig(userId);
      if (saved) {
        setAiConfig((prev) => ({
          ...prev,
          ...saved,
          limit: clampLimit(saved.limit),
        }));
      }
    } catch (error) {
      console.error("Error loading AI config:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadAIConfig();
  }, [loadAIConfig]);

  const persistConfig = useCallback(
    async (next) => {
      if (!userId) return;
      try {
        await saveAiMatchmakingConfig(userId, next);
      } catch (e) {
        console.error("Failed to persist AI config", e);
        Alert.alert("Error", "Could not save settings. Please try again.");
      }
    },
    [userId]
  );

  const generateAIMatches = useCallback(async () => {
    if (!aiConfig.apiKey?.trim()) {
      Alert.alert(
        "Configuration required",
        "Add your AI API key in settings. For production, prefer a backend-held key."
      );
      openConfigModal();
      return;
    }

    try {
      setLoadingMatches(true);
      const matches = await aiMatchmaking.generateAIMatches(userId, {
        apiKey: aiConfig.apiKey,
        provider: aiConfig.provider,
        limit: clampLimit(aiConfig.limit),
        includeReasons: aiConfig.includeReasons,
        includeConfidence: aiConfig.includeConfidence,
        scenario: aiConfig.scenario,
      });
      setAiMatches(matches);
    } catch (error) {
      console.error("Error generating AI matches:", error);
      Alert.alert(
        "AI matching error",
        error.message || "Failed to generate AI matches"
      );
    } finally {
      setLoadingMatches(false);
    }
  }, [userId, aiConfig, openConfigModal]);

  const generateInsights = useCallback(async () => {
    if (!aiConfig.apiKey?.trim()) {
      Alert.alert(
        "Configuration required",
        "Add your AI API key in settings."
      );
      openConfigModal();
      return;
    }

    try {
      setLoadingInsights(true);
      const aiInsights = await aiMatchmaking.generateInsights(userId, {
        apiKey: aiConfig.apiKey,
        provider: aiConfig.provider,
      });
      setInsights(aiInsights);
      setShowInsights(true);
    } catch (error) {
      console.error("Error generating insights:", error);
      Alert.alert(
        "Insights error",
        error.message || "Failed to generate AI insights"
      );
    } finally {
      setLoadingInsights(false);
    }
  }, [userId, aiConfig, openConfigModal]);

  const onRefresh = async () => {
    if (!aiConfig.apiKey?.trim()) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    await generateAIMatches();
    setRefreshing(false);
  };

  const handleApply = async (match) => {
    const mid = match.id;
    try {
      setCardAction({ id: mid, type: "apply" });
      const { matchmaking } = await import("../lib/matchmaking");
      await matchmaking.applyToOpportunity(userId, match.opportunity_id);
      Alert.alert("Success", "Application submitted successfully!");
      await generateAIMatches();
    } catch (error) {
      console.error("Error applying:", error);
      Alert.alert("Error", "Failed to submit application");
    } finally {
      setCardAction(null);
    }
  };

  const handlePass = async (match) => {
    const mid = match.id;
    try {
      setCardAction({ id: mid, type: "pass" });
      const { matchmaking } = await import("../lib/matchmaking");
      let rowId = match.match_record_id;
      if (!rowId && match.opportunity_id) {
        const { data: rows } = await supabase
          .from("matches")
          .select("id")
          .eq("user_id", userId)
          .eq("opportunity_id", match.opportunity_id)
          .limit(1);
        rowId = rows?.[0]?.id;
      }
      if (rowId) {
        await matchmaking.updateMatchStatus(rowId, "rejected");
      }
      setAiMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch (error) {
      console.error("Error passing on match:", error);
      Alert.alert("Error", "Failed to update match status");
    } finally {
      setCardAction(null);
    }
  };

  const saveConfigFromModal = async () => {
    if (!configDraft || !userId) {
      setShowConfig(false);
      return;
    }
    const next = {
      ...configDraft,
      limit: clampLimit(configDraft.limit),
    };
    setAiConfig(next);
    await persistConfig(next);
    setShowConfig(false);
    setConfigDraft(null);
  };

  const closeConfigModal = () => {
    setShowConfig(false);
    setConfigDraft(null);
    setScenarioPickerOpen(false);
  };

  const draft = configDraft || aiConfig;

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderInner}>
        <Text style={styles.title}>AI Matchmaking</Text>
        <Text style={styles.subtitle}>
          Intelligent DJ–opportunity matching (power-user: bring your own API key,
          or move credentials to your backend for production).
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.configButton} onPress={openConfigModal}>
            <Ionicons
              name="settings-outline"
              size={20}
              color="hsl(0, 0%, 100%)"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.insightsButton}
            onPress={generateInsights}
            disabled={loadingInsights || loadingMatches}
          >
            {loadingInsights ? (
              <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
            ) : (
              <Ionicons
                name="analytics-outline"
                size={20}
                color="hsl(0, 0%, 0%)"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    ),
    [openConfigModal, generateInsights, loadingInsights, loadingMatches]
  );

  const renderAIMatchCard = ({ item: match }) => {
    const busyApply =
      cardAction?.id === match.id && cardAction.type === "apply";
    const busyPass = cardAction?.id === match.id && cardAction.type === "pass";

    const isBoosted =
      match.is_boosted &&
      match.boost_expires_at &&
      new Date(match.boost_expires_at) > new Date();

    const getTimeRemaining = () => {
      if (!isBoosted) return null;
      const expires = new Date(match.boost_expires_at);
      const now = new Date();
      const diff = expires - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    return (
      <View style={styles.matchCard}>
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
              {formatMatchTypeLabel(match.match_type)}
            </Text>
            {match.confidence != null ? (
              <Text style={styles.confidenceText}>
                {Math.round(match.confidence * 100)}% confidence
              </Text>
            ) : null}
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
                {formatOpportunityDate(match.opportunity?.event_date)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color="hsl(0, 0%, 70%)"
              />
              <Text style={styles.detailText}>
                {match.opportunity?.location || "—"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="musical-notes-outline"
                size={16}
                color="hsl(0, 0%, 70%)"
              />
              <Text style={styles.detailText}>
                {match.opportunity?.genre || "—"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color="hsl(0, 0%, 70%)" />
              <Text style={styles.detailText}>
                {formatPayment(match.opportunity?.payment)}
              </Text>
            </View>
          </View>

          {isBoosted ? (
            <Text style={styles.boostTimeRemaining}>
              Boost expires in: {getTimeRemaining()}
            </Text>
          ) : null}

          {match.reasoning ? (
            <View style={styles.aiReasoning}>
              <Text style={styles.reasoningTitle}>AI analysis</Text>
              <Text style={styles.reasoningText}>{match.reasoning}</Text>
            </View>
          ) : null}

          {match.strengths && match.strengths.length > 0 ? (
            <View style={styles.strengthsContainer}>
              <Text style={styles.strengthsTitle}>Key strengths</Text>
              {match.strengths.map((strength, index) => (
                <Text key={index} style={styles.strengthText}>
                  • {strength}
                </Text>
              ))}
            </View>
          ) : null}

          {match.considerations && match.considerations.length > 0 ? (
            <View style={styles.considerationsContainer}>
              <Text style={styles.considerationsTitle}>Considerations</Text>
              {match.considerations.map((consideration, index) => (
                <Text key={index} style={styles.considerationText}>
                  • {consideration}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.matchActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => handlePass(match)}
            disabled={cardBusy || loadingMatches}
          >
            {busyPass ? (
              <ActivityIndicator size="small" color="hsl(0, 0%, 100%)" />
            ) : (
              <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
            )}
            <Text style={styles.actionButtonText}>
              {busyPass ? "Passing..." : "Pass"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={() => handleApply(match)}
            disabled={cardBusy || loadingMatches}
          >
            {busyApply ? (
              <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
            ) : (
              <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 0%)" />
            )}
            <Text style={[styles.actionButtonText, styles.applyButtonText]}>
              {busyApply ? "Applying..." : "Apply"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const emptyList = (
    <View style={styles.emptyState}>
      <Ionicons name="sparkles-outline" size={64} color="hsl(0, 0%, 50%)" />
      <Text style={styles.emptyStateTitle}>Ready for AI matching</Text>
      <Text style={styles.emptyStateText}>
        Generate intelligent matches using your configured provider.
      </Text>
      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateAIMatches}
        disabled={loadingMatches}
      >
        {loadingMatches ? (
          <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
        ) : (
          <Ionicons name="sparkles" size={20} color="hsl(0, 0%, 0%)" />
        )}
        <Text style={styles.generateButtonText}>Generate AI matches</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfigModal = () => (
    <Modal
      visible={showConfig}
      transparent
      animationType="slide"
      onRequestClose={closeConfigModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI configuration</Text>
            <TouchableOpacity onPress={closeConfigModal}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.configForm}>
            <Text style={styles.devNotice}>
              Keys are stored on-device (SecureStore). For end users, prefer a
              backend that holds provider credentials.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AI provider</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    draft.provider === "openai" && styles.radioSelected,
                  ]}
                  onPress={() =>
                    setConfigDraft((d) => ({ ...d, provider: "openai" }))
                  }
                >
                  <Text style={styles.radioText}>OpenAI (GPT-4)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    draft.provider === "claude" && styles.radioSelected,
                  ]}
                  onPress={() =>
                    setConfigDraft((d) => ({ ...d, provider: "claude" }))
                  }
                >
                  <Text style={styles.radioText}>Claude (Anthropic)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API key</Text>
              <TextInput
                style={styles.textInput}
                value={draft.apiKey}
                onChangeText={(text) =>
                  setConfigDraft((d) => ({ ...d, apiKey: text }))
                }
                placeholder="Provider API key"
                placeholderTextColor="hsl(0, 0%, 50%)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Matching scenario</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setScenarioPickerOpen((o) => !o)}
                accessibilityRole="button"
              >
                <Text style={styles.dropdownText}>
                  {MATCH_SCENARIOS.find((s) => s.value === draft.scenario)
                    ?.label || draft.scenario}
                </Text>
                <Ionicons
                  name={scenarioPickerOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
              {scenarioPickerOpen ? (
                <View style={styles.scenarioList}>
                  {MATCH_SCENARIOS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[
                        styles.scenarioRow,
                        draft.scenario === s.value && styles.scenarioRowSelected,
                      ]}
                      onPress={() => {
                        setConfigDraft((d) => ({ ...d, scenario: s.value }));
                        setScenarioPickerOpen(false);
                      }}
                    >
                      <Text style={styles.scenarioRowText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Number of matches ({LIMIT_MIN}–{LIMIT_MAX})
              </Text>
              <TextInput
                style={styles.textInput}
                value={String(draft.limit)}
                onChangeText={(text) => {
                  const parsed = parseInt(text, 10);
                  setConfigDraft((d) => ({
                    ...d,
                    limit: Number.isFinite(parsed)
                      ? clampLimit(parsed)
                      : d.limit,
                  }));
                }}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor="hsl(0, 0%, 50%)"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveConfigFromModal}
            >
              <Text style={styles.saveButtonText}>Save configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderInsightsModal = () => (
    <Modal
      visible={showInsights}
      transparent
      animationType="slide"
      onRequestClose={() => setShowInsights(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI career insights</Text>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.insightsContent}
            contentContainerStyle={styles.insightsContentInner}
          >
            <InsightsContent insights={insights} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loadingMatches && aiMatches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHeader}>
          <Text style={styles.title}>AI Matchmaking</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
          <Text style={styles.loadingText}>AI is analyzing your profile…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={aiMatches}
        keyExtractor={(item) => item.id}
        renderItem={renderAIMatchCard}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyList}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

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
  flatListContent: {
    paddingBottom: 32,
  },
  listHeaderInner: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "hsl(0, 0%, 5%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  loadingHeader: {
    padding: 20,
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
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 16,
    lineHeight: 20,
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
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
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
    paddingTop: 24,
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
  matchCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
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
  boostTimeRemaining: {
    fontSize: 11,
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
    fontStyle: "italic",
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
    maxHeight: "85%",
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
  devNotice: {
    fontSize: 12,
    color: "hsl(0, 0%, 55%)",
    marginBottom: 16,
    lineHeight: 18,
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
    flex: 1,
  },
  scenarioList: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    overflow: "hidden",
  },
  scenarioRow: {
    padding: 12,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  scenarioRowSelected: {
    backgroundColor: "hsl(0, 0%, 14%)",
  },
  scenarioRowText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 15,
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
    maxHeight: 480,
  },
  insightsContentInner: {
    padding: 20,
    paddingBottom: 32,
  },
  insightSection: {
    marginBottom: 20,
  },
  insightSectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
  },
  insightBodyText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 82%)",
    lineHeight: 22,
  },
  insightBullet: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 22,
    marginBottom: 4,
  },
  insightsFallbackText: {
    fontSize: 14,
    color: "hsl(0, 0%, 65%)",
    lineHeight: 20,
  },
});
