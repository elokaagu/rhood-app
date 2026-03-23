/**
 * Defaults and policy-shaped settings.
 *
 * Sections marked **(app-level only)** are not enforced by this module — they only take
 * effect if other code reads them and implements quotas, encryption, etc.
 */

/** Matchmaking request defaults merged with user overrides (shallow merge). */
export const AI_DEFAULTS = {
  provider: "openai",
  model: "gpt-4o",
  /** Default Anthropic model id when `provider === "claude"` */
  claudeModel: "claude-3-5-sonnet-20241022",
  scenario: "standardMatching",
  maxTokens: 3000,
  temperature: 0.7,
  maxMatches: 10,
  includeReasons: true,
  includeConfidence: true,
  timeout: 30000,
  retryAttempts: 3,
};

/**
 * Rough per-provider ceilings for client-side throttling / UX — not provider API truth.
 * Enforce with your own rate limiter if needed.
 */
/** Illustrative caps for app-side throttling — not provider API truth. */
export const AI_RATE_LIMITS_APP_ESTIMATES = {
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000,
    requestsPerDay: 10000,
  },
  claude: {
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
    requestsPerDay: 5000,
  },
};

/** (app-level only) — requires a cost-tracking implementation to mean anything */
export const AI_COST_TRACKING_POLICY = {
  enabled: true,
  maxMonthlyCost: 100,
  alertThreshold: 80,
  trackByUser: true,
  trackByProvider: true,
};

export const AI_CACHING = {
  enabled: true,
  ttl: 3600,
  maxCacheSize: 1000,
  cacheKeyStrategy: "user_scenario_opportunities_hash",
};

export const AI_ERROR_HANDLING = {
  fallbackToAlgorithmic: true,
  logErrors: true,
  retryOnFailure: true,
  maxRetries: 3,
  retryDelay: 1000,
};

/** (app-level only) — wire analytics calls if you want these toggles to apply */
export const AI_ANALYTICS_FLAGS = {
  trackMatchQuality: true,
  trackUserSatisfaction: true,
  trackAIPerformance: true,
  trackCostEfficiency: true,
  generateInsights: true,
};

/** (app-level only) — security must be implemented in API routes / client */
export const AI_SECURITY_POLICY = {
  encryptApiKeys: true,
  validateApiKeys: true,
  sanitizeInputs: true,
  logApiUsage: true,
  maxRequestSize: 10000,
};
