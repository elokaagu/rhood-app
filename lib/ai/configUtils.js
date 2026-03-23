import { aiConfig } from "./buildAiConfig";

export function getProvider(providerName) {
  return aiConfig.providers[providerName] || aiConfig.providers.openai;
}

export function getScenario(scenarioName) {
  return aiConfig.scenarios[scenarioName] || aiConfig.scenarios.standardMatching;
}

function getModelRecord(providerName, modelName) {
  const provider = getProvider(providerName);
  if (!provider?.models) return null;
  return provider.models[modelName] || Object.values(provider.models)[0] || null;
}

export function getModel(providerName, modelName) {
  return getModelRecord(providerName, modelName);
}

/**
 * Replace `{apiKey}` placeholders in provider header templates (ready for fetch).
 * @param {string} providerName
 * @param {string} apiKey
 * @returns {Record<string, string>}
 */
export function buildProviderHeaders(providerName, apiKey) {
  const provider = getProvider(providerName);
  const out = {};
  const key = apiKey ?? "";
  for (const [k, v] of Object.entries(provider.headers || {})) {
    out[k] = typeof v === "string" ? v.replace(/\{apiKey\}/g, key) : v;
  }
  return out;
}

/**
 * Rough USD estimate for a single request — **not** for billing or invoices.
 * Uses separate input/output estimates when `model.pricing` is set.
 */
export function estimateRequestCostUSD(
  providerName,
  modelName,
  inputTokens,
  outputTokens
) {
  const model = getModelRecord(providerName, modelName);
  if (!model) return 0;

  const inTok = Number(inputTokens) || 0;
  const outTok = Number(outputTokens) || 0;
  const p = model.pricing;

  if (
    p &&
    typeof p.inputPer1kUSD === "number" &&
    typeof p.outputPer1kUSD === "number"
  ) {
    return (inTok / 1000) * p.inputPer1kUSD + (outTok / 1000) * p.outputPer1kUSD;
  }

  /** @deprecated legacy single-rate field */
  const legacy = model.costPer1kTokens;
  if (typeof legacy === "number") {
    return ((inTok + outTok) / 1000) * legacy;
  }

  return 0;
}

/** @deprecated Use {@link estimateRequestCostUSD} — name kept for callers */
export function calculateCost(
  providerName,
  modelName,
  inputTokens,
  outputTokens
) {
  return estimateRequestCostUSD(
    providerName,
    modelName,
    inputTokens,
    outputTokens
  );
}

export function validateConfig(config) {
  const errors = [];

  if (config == null || typeof config !== "object") {
    errors.push("Config must be an object");
    return { isValid: false, errors };
  }

  if (!config.apiKey) {
    errors.push("API key is required");
  }

  if (!config.provider || !aiConfig.providers[config.provider]) {
    errors.push("Valid provider is required");
  }

  if (config.provider && !config.model) {
    errors.push("Model is required when provider is specified");
  }

  if (config.provider && config.model) {
    const provider = getProvider(config.provider);
    if (!provider.models[config.model]) {
      errors.push(
        `Model ${config.model} not available for provider ${config.provider}`
      );
    }
  }

  if (config.scenario != null && config.scenario !== "") {
    if (!aiConfig.scenarios[config.scenario]) {
      errors.push(`Invalid scenario: ${config.scenario}`);
    }
  }

  if (config.maxMatches != null) {
    const n = Number(config.maxMatches);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      errors.push("Max matches must be between 1 and 50");
    }
  }

  if (config.temperature != null) {
    const t = Number(config.temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2) {
      errors.push("temperature must be a number between 0 and 2");
    }
  }

  if (config.timeout != null) {
    const ms = Number(config.timeout);
    if (!Number.isFinite(ms) || ms < 1000 || ms > 600000) {
      errors.push("timeout must be between 1000 and 600000 (ms)");
    }
  }

  if (config.maxTokens != null) {
    const mt = Number(config.maxTokens);
    if (!Number.isFinite(mt) || mt < 1 || mt > 200000) {
      errors.push("maxTokens must be between 1 and 200000");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getDefaultConfig() {
  return { ...aiConfig.defaults };
}

/**
 * Shallow merge only. Nested objects under `userConfig` replace entire keys.
 */
export function mergeWithDefaults(userConfig) {
  if (!userConfig || typeof userConfig !== "object") {
    return { ...aiConfig.defaults };
  }
  return {
    ...aiConfig.defaults,
    ...userConfig,
  };
}

export function getAvailableProviders() {
  return Object.keys(aiConfig.providers).map((key) => ({
    key,
    ...aiConfig.providers[key],
  }));
}

export function getAvailableScenarios() {
  return Object.keys(aiConfig.scenarios).map((key) => ({
    key,
    ...aiConfig.scenarios[key],
  }));
}

export function getAvailableModels(providerName) {
  const provider = getProvider(providerName);
  return Object.keys(provider.models || {}).map((key) => ({
    key,
    ...provider.models[key],
  }));
}

/**
 * Object form for older call sites. Prefer named imports — all methods are
 * bound-free and safe to destructure.
 */
export const configUtils = {
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
};
