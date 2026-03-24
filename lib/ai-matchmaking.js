// R/HOOD AI Matchmaking Engine
// High-level AI-powered matching using Claude/OpenAI for intelligent ranking

import { matchmaking } from './matchmaking';
import { supabase } from './supabase';
import { aiConfig } from './ai-config';
import { buildProviderHeaders, getProvider } from './ai/configUtils';
import { buildMatchmakingPrompt } from './ai-prompt-templates';
import { buildInsightPrompt } from './ai-insight-prompt-templates';

class AIMatchmakingEngine {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = aiConfig.providers?.[provider] ? provider : aiConfig.defaults.provider;
    this.providerConfig = getProvider(this.provider);
    this.baseUrl = this.providerConfig.baseUrl;
    this.openaiModelId = aiConfig.defaults.model;
    this.claudeModelId = aiConfig.defaults.claudeModel || Object.keys(aiConfig.providers?.claude?.models || {})[0];
    this.timeoutMs = Number(aiConfig.defaults.timeout) || 30000;
    this.retryAttempts = Number(
      aiConfig.errorHandling?.maxRetries ?? aiConfig.defaults.retryAttempts ?? 0
    );
    this.retryDelayMs = Number(aiConfig.errorHandling?.retryDelay) || 1000;
  }

  // =============================================
  // CORE AI MATCHING FUNCTIONS
  // =============================================

  /**
   * Generate AI-powered matches with intelligent ranking
   */
  async generateAIMatches(userId, options = {}) {
    try {
      const {
        limit = 10,
        shortlistLimit = 20,
        aiBatchSize = 10,
        includeReasons = true,
        includeConfidence = true,
        customWeights = null,
        scenario = 'standardMatching',
      } = options;

      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);
      const userPreferences = await matchmaking.getDJPreferences(userId);
      const userAvailability = await matchmaking.getAvailability(userId);

      // Get available opportunities
      const opportunities = await this.getAvailableOpportunities(userId, {
        preferredGenres: userProfile.genres,
        preferences: userPreferences,
      });
      const shortlistedOpportunities = await this.selectOpportunitiesForAI({
        userId,
        opportunities,
        userProfile,
        userPreferences,
        limit,
        shortlistLimit,
      });

      // Generate AI matches
      const aiMatches = await this.processAIMatching({
        userId,
        userProfile,
        userPreferences,
        userAvailability,
        opportunities: shortlistedOpportunities,
        limit,
        aiBatchSize,
        includeReasons,
        includeConfidence,
        customWeights,
        scenario,
      });

      return aiMatches;
    } catch (error) {
      console.error('Error generating AI matches:', error);
      throw error;
    }
  }

  /**
   * Process AI matching with Claude/OpenAI
   */
  async processAIMatching({
    userId,
    userProfile,
    userPreferences,
    userAvailability,
    opportunities,
    limit,
    aiBatchSize,
    includeReasons,
    includeConfidence,
    customWeights,
    scenario,
  }) {
    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      return [];
    }

    const batches = this.chunkArray(opportunities, Math.max(1, aiBatchSize || 10));
    let matches = [];

    for (const batch of batches) {
      const prompt = this.buildMatchingPrompt({
        userProfile,
        userPreferences,
        userAvailability,
        opportunities: batch,
        customWeights,
        scenario,
      });

      const aiResponse = await this.callAI(prompt, scenario);
      const batchMatches = await this.parseAIResponse(aiResponse, batch, userId);
      matches = this.mergeBatchMatches(matches, batchMatches);
    }

    if (matches.length === 0) {
      matches = await this.fallbackParse(userId, opportunities);
    }

    // Add additional metadata
    const enrichedMatches = await this.enrichMatches(matches, {
      includeReasons,
      includeConfidence,
      opportunities,
    });

    return enrichedMatches.slice(0, limit);
  }

  /**
   * Build comprehensive matching prompt
   */
  buildMatchingPrompt({
    userProfile,
    userPreferences,
    userAvailability,
    opportunities,
    customWeights,
    scenario,
  }) {
    return buildMatchmakingPrompt({
      scenario,
      variables: {
        dj_name: userProfile.dj_name || 'N/A',
        full_name: userProfile.full_name || 'N/A',
        city: userProfile.city || 'N/A',
        bio: userProfile.bio || 'No bio provided',
        genres: userProfile.genres?.join(', ') || 'Not specified',
        preferences: this.formatPreferences(userPreferences),
        availability: this.formatAvailability(userAvailability),
        opportunities: this.formatOpportunities(opportunities),
        weights: customWeights ? this.formatCustomWeights(customWeights) : 'No custom weights',
      },
    });
  }

  // =============================================
  // AI API INTEGRATION
  // =============================================

  /**
   * Call AI API (OpenAI or Claude)
   */
  async callAI(prompt, scenario = 'standardMatching') {
    try {
      if (this.provider === 'openai') {
        return await this.callOpenAI(prompt, scenario);
      } else {
        return await this.callClaude(prompt, scenario);
      }
    } catch (error) {
      console.error('AI API call failed:', error);
      throw new Error('AI matching service unavailable');
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, scenario = 'standardMatching') {
    const scenarioConfig = aiConfig.scenarios?.[scenario] || aiConfig.scenarios?.standardMatching || {};
    const temperature = Number.isFinite(Number(scenarioConfig.temperature))
      ? Number(scenarioConfig.temperature)
      : aiConfig.defaults.temperature;
    const maxTokens = Number.isFinite(Number(scenarioConfig.maxTokens))
      ? Number(scenarioConfig.maxTokens)
      : aiConfig.defaults.maxTokens;

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildProviderHeaders(this.provider, this.apiKey),
      body: JSON.stringify({
        model: this.openaiModelId,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Claude API
   */
  async callClaude(prompt, scenario = 'standardMatching') {
    const scenarioConfig = aiConfig.scenarios?.[scenario] || aiConfig.scenarios?.standardMatching || {};
    const maxTokens = Number.isFinite(Number(scenarioConfig.maxTokens))
      ? Number(scenarioConfig.maxTokens)
      : aiConfig.defaults.maxTokens;

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: buildProviderHeaders(this.provider, this.apiKey),
      body: JSON.stringify({
        model: this.claudeModelId,
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // =============================================
  // DATA FORMATTING HELPERS
  // =============================================

  /**
   * Format user preferences for AI prompt
   */
  formatPreferences(preferences) {
    if (!preferences || preferences.length === 0) {
      return 'No specific preferences set';
    }

    return preferences.map(pref => {
      const value = typeof pref.preference_value === 'object' 
        ? JSON.stringify(pref.preference_value)
        : pref.preference_value;
      
      return `- **${pref.preference_type}**: ${value} (importance: ${pref.importance_score})`;
    }).join('\n');
  }

  /**
   * Format availability for AI prompt
   */
  formatAvailability(availability) {
    if (!availability || availability.length === 0) {
      return 'No availability information provided';
    }

    return availability.map(avail => {
      const from = new Date(avail.date_from).toLocaleDateString();
      const to = new Date(avail.date_to).toLocaleDateString();
      const status = avail.is_available ? 'Available' : 'Unavailable';
      const notes = avail.notes ? ` (${avail.notes})` : '';
      
      return `- **${from} to ${to}**: ${status}${notes}`;
    }).join('\n');
  }

  /**
   * Format opportunities for AI prompt
   */
  formatOpportunities(opportunities) {
    return opportunities.map((opp, index) => `
**Opportunity ${index + 1}: ${opp.title}**
- **Description**: ${opp.description}
- **Date**: ${new Date(opp.event_date).toLocaleDateString()}
- **Location**: ${opp.location}
- **Genre**: ${opp.genre}
- **Skill Level**: ${opp.skill_level}
- **Payment**: $${opp.payment}
- **Organizer**: ${opp.organizer_name}
- **Requirements**: ${this.formatOpportunityRequirements(opp.opportunity_requirements || [])}
`).join('\n');
  }

  /**
   * Format opportunity requirements
   */
  formatOpportunityRequirements(requirements) {
    if (!requirements || requirements.length === 0) {
      return 'No specific requirements listed';
    }

    return requirements.map(req => {
      const value = typeof req.requirement_value === 'object'
        ? JSON.stringify(req.requirement_value)
        : req.requirement_value;
      
      return `${req.requirement_type}: ${value}`;
    }).join(', ');
  }

  /**
   * Format custom weights for AI prompt
   */
  formatCustomWeights(weights) {
    return `
## CUSTOM MATCHING WEIGHTS
${Object.entries(weights).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
`;
  }

  // =============================================
  // DATA RETRIEVAL HELPERS
  // =============================================

  /**
   * Get user profile data
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get available opportunities for matching
   */
  async getAvailableOpportunities(userId, options = {}) {
    const { preferredGenres = [], preferences = [] } = options;
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        opportunity_requirements(*)
      `)
      .eq('is_active', true)
      .gt('event_date', new Date().toISOString())
      .order('event_date');

    if (error) throw error;

    let opportunities = Array.isArray(data) ? data : [];

    // Exclude opportunities the user has already applied for.
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('applications')
      .select('opportunity_id')
      .eq('user_id', userId);
    if (!applicationsError && Array.isArray(applicationsData) && applicationsData.length > 0) {
      const appliedIds = new Set(applicationsData.map((row) => row.opportunity_id));
      opportunities = opportunities.filter((opp) => !appliedIds.has(opp.id));
    }

    return this.applyBusinessFilters(opportunities, { preferredGenres, preferences });
  }

  async selectOpportunitiesForAI({
    userId,
    opportunities,
    userProfile,
    userPreferences,
    limit,
    shortlistLimit,
  }) {
    const desiredShortlist = Math.max(limit, shortlistLimit || 20);
    const candidatePoolSize = Math.max(desiredShortlist * 3, 30);
    const filtered = this.applyBusinessFilters(opportunities, {
      preferredGenres: userProfile?.genres || [],
      preferences: userPreferences || [],
    }).slice(0, candidatePoolSize);

    if (filtered.length <= desiredShortlist) {
      return filtered;
    }

    try {
      const algorithmicMatches = await matchmaking.generateMatches(userId, candidatePoolSize);
      if (!Array.isArray(algorithmicMatches) || algorithmicMatches.length === 0) {
        return filtered.slice(0, desiredShortlist);
      }

      const filteredById = new Map(filtered.map((opp) => [opp.id, opp]));
      const shortlisted = [];
      const seen = new Set();

      for (const match of algorithmicMatches) {
        const opp = filteredById.get(match.opportunity_id);
        if (!opp || seen.has(opp.id)) continue;
        shortlisted.push(opp);
        seen.add(opp.id);
        if (shortlisted.length >= desiredShortlist) break;
      }

      if (shortlisted.length < desiredShortlist) {
        for (const opp of filtered) {
          if (seen.has(opp.id)) continue;
          shortlisted.push(opp);
          seen.add(opp.id);
          if (shortlisted.length >= desiredShortlist) break;
        }
      }

      return shortlisted;
    } catch (error) {
      console.error('Algorithmic pre-shortlisting failed:', error);
      return filtered.slice(0, desiredShortlist);
    }
  }

  applyBusinessFilters(opportunities, { preferredGenres = [], preferences = [] } = {}) {
    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      return [];
    }

    const preferredGenreSet = new Set(
      (preferredGenres || []).map((g) => String(g).trim().toLowerCase()).filter(Boolean)
    );
    const minPayment = this.extractMinPaymentPreference(preferences);

    return [...opportunities]
      .map((opp) => {
        let score = 0;
        const oppGenres = String(opp.genre || '')
          .split(',')
          .map((g) => g.trim().toLowerCase())
          .filter(Boolean);
        const hasGenreMatch = oppGenres.some((g) => preferredGenreSet.has(g));
        if (hasGenreMatch) score += 2;

        const payment = Number(opp.payment);
        if (Number.isFinite(minPayment) && Number.isFinite(payment) && payment >= minPayment) {
          score += 1;
        }

        return { opp, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.opp.event_date).getTime() - new Date(b.opp.event_date).getTime();
      })
      .map((entry) => entry.opp);
  }

  extractMinPaymentPreference(preferences) {
    if (!Array.isArray(preferences)) return null;
    const minPaymentTypes = new Set(['min_payment', 'minimum_payment', 'payment_min']);
    for (const pref of preferences) {
      const type = String(pref?.preference_type || '').toLowerCase();
      if (!minPaymentTypes.has(type)) continue;
      const value = Number(pref?.preference_value);
      if (Number.isFinite(value)) return value;
    }
    return null;
  }

  // =============================================
  // RESPONSE PROCESSING
  // =============================================

  /**
   * Parse AI response into structured data
   */
  async parseAIResponse(response, opportunities, userId) {
    try {
      const parsed = this.extractJsonObject(response);
      if (!Array.isArray(parsed.matches)) {
        throw new Error('AI response missing matches array');
      }
      return this.validateAndNormalizeMatches(parsed.matches, opportunities);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.fallbackParse(userId, opportunities);
    }
  }

  /**
   * Fallback parsing for malformed AI responses
   */
  async fallbackParse(userId, opportunities) {
    try {
      const algorithmicMatches = await matchmaking.generateMatches(userId, opportunities.length || 20);
      if (!Array.isArray(algorithmicMatches) || algorithmicMatches.length === 0) {
        return [];
      }

      return algorithmicMatches.map((match, index) => ({
        opportunity_id: match.opportunity_id,
        compatibility_score: this.clampScore(match.match_score),
        ranking: index + 1,
        reasoning: 'Fallback ranking generated using deterministic algorithmic matcher',
        strengths: ['Algorithmic compatibility score'],
        considerations: ['AI response was malformed; no generated reasoning'],
        confidence: 0.6,
        match_type: 'algorithmic_fallback'
      }));
    } catch (error) {
      console.error('Algorithmic fallback failed:', error);
      return [];
    }
  }

  /**
   * Enrich matches with additional data
   */
  async enrichMatches(matches, options) {
    const { includeReasons, includeConfidence, opportunities = [] } = options;

    return matches.map((match, idx) => {
      const opp =
        opportunities.find((o) => o.id === match.opportunity_id) || {
          id: match.opportunity_id,
        };
      const enriched = {
        ...match,
        id: match.id || `${match.opportunity_id}-${match.ranking ?? idx + 1}`,
        opportunity: opp,
      };

      if (includeReasons) {
        enriched.detailed_reasons = this.generateDetailedReasons(match);
      }

      if (includeConfidence) {
        enriched.confidence_breakdown = this.generateConfidenceBreakdown(match);
      }

      return enriched;
    });
  }

  /**
   * Generate detailed reasons for match
   */
  generateDetailedReasons(match) {
    const strengths = Array.isArray(match.strengths) ? match.strengths.length : 0;
    const considerations = Array.isArray(match.considerations) ? match.considerations.length : 0;
    const score = this.clampScore(match.compatibility_score);
    return {
      musical_fit: score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low',
      skill_alignment: score >= 85 ? 'Perfect' : score >= 70 ? 'Good' : 'Needs review',
      venue_compatibility: strengths >= 2 ? 'Strong' : 'Moderate',
      career_impact: considerations === 0 ? 'High' : 'Moderate',
    };
  }

  /**
   * Generate confidence breakdown
   */
  generateConfidenceBreakdown(match) {
    const overall = Number.isFinite(match.confidence) ? match.confidence : 0.8;
    const normalizedOverall = Math.max(0, Math.min(1, overall));
    const scoreSignal = this.clampScore(match.compatibility_score) / 100;
    return {
      overall: normalizedOverall,
      data_quality: 0.9,
      market_analysis: Math.max(0.5, Math.min(1, scoreSignal)),
      preference_alignment: Math.max(0.5, Math.min(1, (normalizedOverall + scoreSignal) / 2))
    };
  }

  chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  mergeBatchMatches(existingMatches, nextMatches) {
    const merged = new Map();
    for (const match of [...existingMatches, ...nextMatches]) {
      const id = match.opportunity_id;
      const current = merged.get(id);
      if (!current) {
        merged.set(id, match);
        continue;
      }
      const score = this.clampScore(match.compatibility_score);
      const currentScore = this.clampScore(current.compatibility_score);
      if (score > currentScore) {
        merged.set(id, match);
      }
    }

    return [...merged.values()]
      .sort((a, b) => {
        if (b.compatibility_score !== a.compatibility_score) {
          return b.compatibility_score - a.compatibility_score;
        }
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .map((match, index) => ({
        ...match,
        ranking: index + 1,
      }));
  }

  // =============================================
  // INTERNAL RESILIENCE HELPERS
  // =============================================

  async fetchWithRetry(url, options) {
    const maxAttempts = Math.max(1, this.retryAttempts + 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        if (response.ok || !this.shouldRetryStatus(response.status) || attempt >= maxAttempts) {
          return response;
        }
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }
      }
      await this.delay(this.retryDelayMs * attempt);
    }

    throw new Error('Exhausted retry attempts');
  }

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  shouldRetryStatus(status) {
    return status === 429 || status >= 500;
  }

  extractJsonObject(response) {
    const trimmed = String(response || '').trim();
    if (!trimmed) {
      throw new Error('Empty AI response');
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }

    const start = trimmed.indexOf('{');
    if (start === -1) {
      throw new Error('No JSON object start found');
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const jsonText = trimmed.slice(start, i + 1);
          return JSON.parse(jsonText);
        }
      }
    }

    throw new Error('No complete JSON object found');
  }

  validateAndNormalizeMatches(matches, opportunities) {
    const opportunityIds = new Set(opportunities.map((opp) => opp.id));
    const normalized = [];

    for (const [index, rawMatch] of matches.entries()) {
      const opportunityId = rawMatch?.opportunity_id;
      if (!opportunityIds.has(opportunityId)) {
        continue;
      }

      const compatibilityScore = this.clampScore(rawMatch.compatibility_score);
      const ranking = Number.isInteger(rawMatch.ranking) && rawMatch.ranking > 0
        ? rawMatch.ranking
        : index + 1;
      const confidence = Number(rawMatch.confidence);
      const matchType = this.normalizeMatchType(rawMatch.match_type);

      normalized.push({
        opportunity_id: opportunityId,
        compatibility_score: compatibilityScore,
        ranking,
        reasoning: String(rawMatch.reasoning || '').trim() || 'No reasoning provided',
        strengths: Array.isArray(rawMatch.strengths) ? rawMatch.strengths.map(String) : [],
        considerations: Array.isArray(rawMatch.considerations) ? rawMatch.considerations.map(String) : [],
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.75,
        match_type: matchType
      });
    }

    return normalized.sort((a, b) => a.ranking - b.ranking);
  }

  clampScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  normalizeMatchType(value) {
    const allowedTypes = new Set([
      'perfect_fit',
      'good_fit',
      'interesting_opportunity',
      'stretch_goal',
      'algorithmic_fallback',
    ]);
    const type = String(value || '').trim();
    return allowedTypes.has(type) ? type : 'good_fit';
  }

  // =============================================
  // ANALYTICS AND FEEDBACK
  // =============================================

  /**
   * Generate AI insights for user
   */
  async generateAIInsights(userId) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const preferences = await matchmaking.getDJPreferences(userId);
      const performanceHistory = await matchmaking.getPerformanceHistory(userId, 10);

      const prompt = this.buildInsightsPrompt({
        userProfile,
        preferences,
        performanceHistory
      });

      const aiResponse = await this.callAI(prompt);
      return this.parseInsightsResponse(aiResponse);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw error;
    }
  }

  /**
   * Build insights prompt
   */
  buildInsightsPrompt({ userProfile, preferences, performanceHistory }) {
    return buildInsightPrompt({
      template: 'careerAnalysis',
      variables: {
        dj_name: userProfile.dj_name || 'N/A',
        current_level: userProfile.skill_level || 'Not specified',
        career_objectives: userProfile.career_objectives || 'Not provided',
        market_positioning: userProfile.market_positioning || 'Not provided',
        preferences: this.formatPreferences(preferences),
        performance_history: performanceHistory.map((perf) =>
          `- ${perf.performance_date}: ${perf.rating}/5 stars - ${perf.feedback || 'No feedback'}`
        ).join('\n'),
        market_insights: `Location: ${userProfile.city || 'N/A'}; Genres: ${userProfile.genres?.join(', ') || 'Not specified'}; Bio: ${userProfile.bio || 'No bio provided'}`,
      },
    });
  }

  /**
   * Parse insights response
   */
  parseInsightsResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in insights response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing insights response:', error);
      return { error: 'Failed to parse AI insights' };
    }
  }
}

// =============================================
// EXPORT AND CONFIGURATION
// =============================================

export const aiMatchmaking = {
  /**
   * Initialize AI matchmaking engine
   */
  createEngine(apiKey, provider = 'openai') {
    return new AIMatchmakingEngine(apiKey, provider);
  },

  /**
   * Generate matches using caller-supplied credentials (prefer backend-owned keys in production).
   * @param {string} userId
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} [options.provider='openai']
   * @param {number} [options.limit]
   * @param {boolean} [options.includeReasons]
   * @param {boolean} [options.includeConfidence]
   * @param {number} [options.shortlistLimit]
   * @param {number} [options.aiBatchSize]
   * @param {string} [options.scenario]
   * @param {object} [options.customWeights]
   */
  async generateAIMatches(userId, options = {}) {
    const {
      apiKey,
      provider = 'openai',
      limit,
      includeReasons,
      includeConfidence,
      shortlistLimit,
      aiBatchSize,
      scenario,
      customWeights,
    } = options;

    const key = apiKey != null ? String(apiKey).trim() : '';
    if (!key) {
      throw new Error('API key is required');
    }

    const engine = new AIMatchmakingEngine(key, provider);
    return engine.generateAIMatches(userId, {
      limit,
      includeReasons,
      includeConfidence,
      shortlistLimit,
      aiBatchSize,
      scenario,
      customWeights,
    });
  },

  /**
   * Quick match generation with default settings
   */
  async quickMatch(userId, apiKey, provider = 'openai') {
    return this.generateAIMatches(userId, {
      apiKey,
      provider,
      limit: 5,
    });
  },

  /**
   * Generate insights for user
   * @param {string} userId
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} [options.provider='openai']
   */
  async generateInsights(userId, options = {}) {
    const { apiKey, provider = 'openai' } = options;

    const key = apiKey != null ? String(apiKey).trim() : '';
    if (!key) {
      throw new Error('API key is required');
    }

    const engine = new AIMatchmakingEngine(key, provider);
    return engine.generateAIInsights(userId);
  },
};

export default aiMatchmaking;
