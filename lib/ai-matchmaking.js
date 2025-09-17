// R/HOOD AI Matchmaking Engine
// High-level AI-powered matching using Claude/OpenAI for intelligent ranking

import { matchmaking } from './matchmaking';
import { supabase } from './supabase';

class AIMatchmakingEngine {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.baseUrl = provider === 'openai' 
      ? 'https://api.openai.com/v1'
      : 'https://api.anthropic.com/v1';
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
        includeReasons = true,
        includeConfidence = true,
        customWeights = null
      } = options;

      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);
      const userPreferences = await matchmaking.getDJPreferences(userId);
      const userAvailability = await matchmaking.getAvailability(userId);

      // Get available opportunities
      const opportunities = await this.getAvailableOpportunities(userId);

      // Generate AI matches
      const aiMatches = await this.processAIMatching({
        userProfile,
        userPreferences,
        userAvailability,
        opportunities,
        limit,
        includeReasons,
        includeConfidence,
        customWeights
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
    userProfile,
    userPreferences,
    userAvailability,
    opportunities,
    limit,
    includeReasons,
    includeConfidence,
    customWeights
  }) {
    const prompt = this.buildMatchingPrompt({
      userProfile,
      userPreferences,
      userAvailability,
      opportunities,
      customWeights
    });

    const aiResponse = await this.callAI(prompt);
    const matches = this.parseAIResponse(aiResponse, opportunities);

    // Add additional metadata
    const enrichedMatches = await this.enrichMatches(matches, {
      includeReasons,
      includeConfidence
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
    customWeights
  }) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt({
      userProfile,
      userPreferences,
      userAvailability,
      opportunities,
      customWeights
    });

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Get system prompt for AI matching
   */
  getSystemPrompt() {
    return `You are an expert DJ booking agent and music industry professional with 15+ years of experience in underground music scenes worldwide. Your expertise includes:

- Deep understanding of electronic music genres, subgenres, and scene dynamics
- Knowledge of DJ skill levels, equipment requirements, and performance styles
- Experience with venue types, crowd dynamics, and event atmospheres
- Understanding of payment structures, travel considerations, and industry standards
- Insight into emerging artists, established acts, and market trends

Your task is to analyze DJ profiles and opportunity briefs to create intelligent, ranked matches that consider:

1. **Musical Compatibility**: Genre alignment, style fit, and artistic direction
2. **Skill Level Matching**: Appropriate challenge level and growth opportunities
3. **Venue Atmosphere**: DJ style compatibility with venue vibe and crowd
4. **Career Development**: Opportunities that advance the DJ's career trajectory
5. **Logistical Feasibility**: Travel, availability, equipment, and practical considerations
6. **Market Positioning**: How the opportunity fits the DJ's brand and market presence

Provide detailed reasoning for each match, considering both obvious fits and unexpected but valuable opportunities. Be specific about why each match works and what makes it special.`;
  }

  /**
   * Get user prompt with specific matching data
   */
  getUserPrompt({
    userProfile,
    userPreferences,
    userAvailability,
    opportunities,
    customWeights
  }) {
    const preferencesText = this.formatPreferences(userPreferences);
    const availabilityText = this.formatAvailability(userAvailability);
    const opportunitiesText = this.formatOpportunities(opportunities);
    const weightsText = customWeights ? this.formatCustomWeights(customWeights) : '';

    return `Please analyze and rank the following DJ-opportunity matches:

## DJ PROFILE
**Name**: ${userProfile.dj_name || 'N/A'}
**Full Name**: ${userProfile.full_name || 'N/A'}
**Location**: ${userProfile.city || 'N/A'}
**Bio**: ${userProfile.bio || 'No bio provided'}
**Genres**: ${userProfile.genres?.join(', ') || 'Not specified'}

## DJ PREFERENCES
${preferencesText}

## AVAILABILITY
${availabilityText}

## OPPORTUNITIES TO MATCH
${opportunitiesText}

${weightsText}

## INSTRUCTIONS
1. Analyze each opportunity against the DJ's profile, preferences, and availability
2. Consider musical compatibility, skill level appropriateness, venue atmosphere, and career development potential
3. Rank opportunities from best match to least suitable
4. Provide a compatibility score (0-100) for each match
5. Give detailed reasoning for your top 5 recommendations
6. Highlight any unique or unexpected opportunities that could be valuable
7. Note any potential concerns or considerations for each match

Return your analysis in the following JSON format:
{
  "matches": [
    {
      "opportunity_id": "uuid",
      "compatibility_score": 85,
      "ranking": 1,
      "reasoning": "Detailed explanation of why this is a great match...",
      "strengths": ["Key strengths of this match"],
      "considerations": ["Any concerns or things to consider"],
      "confidence": 0.92,
      "match_type": "perfect_fit|good_fit|interesting_opportunity|stretch_goal"
    }
  ],
  "summary": {
    "total_analyzed": 10,
    "high_confidence_matches": 3,
    "recommended_actions": ["Action items for the DJ"],
    "market_insights": ["Industry insights based on the analysis"]
  }
}`;
  }

  // =============================================
  // AI API INTEGRATION
  // =============================================

  /**
   * Call AI API (OpenAI or Claude)
   */
  async callAI(prompt) {
    try {
      if (this.provider === 'openai') {
        return await this.callOpenAI(prompt);
      } else {
        return await this.callClaude(prompt);
      }
    } catch (error) {
      console.error('AI API call failed:', error);
      throw new Error('AI matching service unavailable');
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.7,
        max_tokens: 4000
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
  async callClaude(prompt) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
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
- **Requirements**: ${this.formatOpportunityRequirements(opp.requirements || [])}
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
  async getAvailableOpportunities(userId) {
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
    return data;
  }

  // =============================================
  // RESPONSE PROCESSING
  // =============================================

  /**
   * Parse AI response into structured data
   */
  parseAIResponse(response, opportunities) {
    try {
      // Extract JSON from response (handle cases where AI includes extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.matches || [];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback to basic parsing
      return this.fallbackParse(response, opportunities);
    }
  }

  /**
   * Fallback parsing for malformed AI responses
   */
  fallbackParse(response, opportunities) {
    // Basic fallback - return opportunities with default scores
    return opportunities.map((opp, index) => ({
      opportunity_id: opp.id,
      compatibility_score: 50 + (index * 5), // Basic scoring
      ranking: index + 1,
      reasoning: 'AI analysis unavailable - using algorithmic scoring',
      strengths: ['Algorithmic match'],
      considerations: ['Manual review recommended'],
      confidence: 0.5,
      match_type: 'algorithmic_fallback'
    }));
  }

  /**
   * Enrich matches with additional data
   */
  async enrichMatches(matches, options) {
    const { includeReasons, includeConfidence } = options;

    return matches.map(match => {
      const enriched = {
        ...match,
        opportunity: this.findOpportunityById(match.opportunity_id)
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
   * Find opportunity by ID
   */
  findOpportunityById(opportunityId) {
    // This would be populated from the opportunities passed to the function
    // In a real implementation, you'd maintain this reference
    return { id: opportunityId };
  }

  /**
   * Generate detailed reasons for match
   */
  generateDetailedReasons(match) {
    return {
      musical_fit: match.reasoning.includes('genre') ? 'High' : 'Medium',
      skill_alignment: match.reasoning.includes('skill') ? 'Perfect' : 'Good',
      venue_compatibility: match.reasoning.includes('venue') ? 'Excellent' : 'Good',
      career_impact: match.reasoning.includes('career') ? 'High' : 'Medium'
    };
  }

  /**
   * Generate confidence breakdown
   */
  generateConfidenceBreakdown(match) {
    return {
      overall: match.confidence || 0.8,
      data_quality: 0.9,
      market_analysis: 0.8,
      preference_alignment: 0.85
    };
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
    const systemPrompt = `You are a music industry consultant and career advisor specializing in DJ and electronic music careers. Analyze the provided DJ profile and performance history to offer strategic career insights and recommendations.`;

    const userPrompt = `Analyze this DJ's profile and provide strategic career insights:

## DJ PROFILE
- Name: ${userProfile.dj_name}
- Location: ${userProfile.city}
- Genres: ${userProfile.genres?.join(', ')}
- Bio: ${userProfile.bio}

## PREFERENCES
${this.formatPreferences(preferences)}

## PERFORMANCE HISTORY
${performanceHistory.map(perf => 
  `- ${perf.performance_date}: ${perf.rating}/5 stars - ${perf.feedback || 'No feedback'}`
).join('\n')}

Provide insights on:
1. Career trajectory and growth opportunities
2. Genre development and market positioning
3. Venue and opportunity recommendations
4. Skill development areas
5. Market trends and timing

Return as structured JSON with actionable recommendations.`;

    return { system: systemPrompt, user: userPrompt };
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
   * Quick match generation with default settings
   */
  async quickMatch(userId, apiKey, provider = 'openai') {
    const engine = new AIMatchmakingEngine(apiKey, provider);
    return await engine.generateAIMatches(userId, { limit: 5 });
  },

  /**
   * Generate insights for user
   */
  async generateInsights(userId, apiKey, provider = 'openai') {
    const engine = new AIMatchmakingEngine(apiKey, provider);
    return await engine.generateAIInsights(userId);
  }
};

export default aiMatchmaking;
