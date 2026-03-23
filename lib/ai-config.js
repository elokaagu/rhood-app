/**
 * AI matchmaking configuration — **barrel** for `lib/ai/*`.
 *
 * - Provider/model metadata and rough **pricing estimates** (not billing truth)
 * - Scenarios, defaults, and policy-shaped flags (enforced only if app code reads them)
 * - Pure helpers in `configUtils` / named exports (no `this`; safe to destructure)
 */

export { aiConfig } from "./ai/buildAiConfig";
export { default } from "./ai/buildAiConfig";

export {
  configUtils,
  getProvider,
  getScenario,
  getModel,
  calculateCost,
  estimateRequestCostUSD,
  buildProviderHeaders,
  validateConfig,
  getDefaultConfig,
  mergeWithDefaults,
  getAvailableProviders,
  getAvailableScenarios,
  getAvailableModels,
} from "./ai/configUtils";

export { AI_PROVIDERS } from "./ai/providers";
export { AI_SCENARIOS } from "./ai/scenarios";
export {
  AI_DEFAULTS,
  AI_RATE_LIMITS_APP_ESTIMATES,
  AI_COST_TRACKING_POLICY,
  AI_CACHING,
  AI_ERROR_HANDLING,
  AI_ANALYTICS_FLAGS,
  AI_SECURITY_POLICY,
} from "./ai/policy";
