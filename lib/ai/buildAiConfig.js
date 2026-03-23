import { AI_PROVIDERS } from "./providers";
import { AI_SCENARIOS } from "./scenarios";
import {
  AI_DEFAULTS,
  AI_RATE_LIMITS_APP_ESTIMATES,
  AI_COST_TRACKING_POLICY,
  AI_CACHING,
  AI_ERROR_HANDLING,
  AI_ANALYTICS_FLAGS,
  AI_SECURITY_POLICY,
} from "./policy";

/**
 * Assembled AI configuration for matchmaking (single import surface).
 * Prefer importing submodules from `lib/ai/*` when tree-shaking or testing slices.
 */
export const aiConfig = {
  providers: AI_PROVIDERS,
  scenarios: AI_SCENARIOS,
  defaults: AI_DEFAULTS,
  /** Illustrative app-side limits — not vendor API guarantees */
  rateLimits: AI_RATE_LIMITS_APP_ESTIMATES,
  costTracking: AI_COST_TRACKING_POLICY,
  caching: AI_CACHING,
  errorHandling: AI_ERROR_HANDLING,
  analytics: AI_ANALYTICS_FLAGS,
  security: AI_SECURITY_POLICY,
};

export default aiConfig;
