/**
 * Provider + model metadata for AI matchmaking.
 *
 * **Pricing:** `pricing.inputPer1kUSD` / `outputPer1kUSD` are rough in-app estimates only.
 * They are not billing truth — use provider dashboards/billing APIs for real costs.
 *
 * **Headers:** Values like `Bearer {apiKey}` are templates; use `buildProviderAuthHeaders()`
 * in configUtils — do not send these objects directly to fetch().
 */

/** @typedef {{ inputPer1kUSD: number, outputPer1kUSD: number }} ModelPricingEstimate */

/**
 * @param {number} inPer1k
 * @param {number} outPer1k
 * @returns {ModelPricingEstimate}
 */
function estimatePricing(inPer1k, outPer1k) {
  return { inputPer1kUSD: inPer1k, outputPer1kUSD: outPer1k };
}

export const AI_PROVIDERS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    /** Template — interpolated at request time */
    authHeaderTemplate: "Bearer {apiKey}",
    models: {
      /** Default “smart” model — update when product standard changes */
      "gpt-4o": {
        name: "GPT-4o",
        label: "GPT-4o",
        maxTokens: 128000,
        pricing: estimatePricing(0.0025, 0.01),
        description: "Strong general reasoning; check OpenAI pricing page for current rates",
      },
      "gpt-4o-mini": {
        name: "GPT-4o mini",
        label: "GPT-4o mini",
        maxTokens: 128000,
        pricing: estimatePricing(0.00015, 0.0006),
        description: "Faster / cheaper for simpler matching prompts",
      },
      "gpt-3.5-turbo": {
        name: "GPT-3.5 Turbo",
        label: "GPT-3.5 Turbo",
        maxTokens: 16385,
        pricing: estimatePricing(0.0005, 0.0015),
        description: "Legacy fast option; verify model retirement with OpenAI",
      },
    },
    headers: {
      Authorization: "Bearer {apiKey}",
      "Content-Type": "application/json",
    },
  },

  claude: {
    name: "Claude (Anthropic)",
    baseUrl: "https://api.anthropic.com/v1",
    authHeaderTemplate: "{apiKey}",
    models: {
      "claude-3-5-sonnet-20241022": {
        name: "Claude 3.5 Sonnet",
        label: "Claude 3.5 Sonnet",
        maxTokens: 200000,
        pricing: estimatePricing(0.003, 0.015),
        description: "Balanced quality/cost; verify id + pricing on Anthropic docs",
      },
      "claude-3-5-haiku-20241022": {
        label: "Claude 3.5 Haiku",
        maxTokens: 200000,
        pricing: estimatePricing(0.0008, 0.004),
        description: "Fast Haiku-class model",
      },
      "claude-3-opus-20240229": {
        name: "Claude 3 Opus",
        label: "Claude 3 Opus",
        maxTokens: 200000,
        pricing: estimatePricing(0.015, 0.075),
        description: "Highest capability; higher cost — confirm current availability",
      },
    },
    headers: {
      "x-api-key": "{apiKey}",
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
  },
};
