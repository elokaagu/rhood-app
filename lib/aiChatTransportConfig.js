import Constants from "expo-constants";

export const AI_CHAT_TRANSPORTS = {
  OPENAI_DIRECT: "openai_direct",
  EDGE_FUNCTION: "edge_function",
  BACKEND_ENDPOINT: "backend_endpoint",
};

const ALLOWED_AI_CHAT_TRANSPORTS = new Set(Object.values(AI_CHAT_TRANSPORTS));

export const AI_CHAT_TRANSPORT_DEFAULTS = {
  transport: AI_CHAT_TRANSPORTS.OPENAI_DIRECT,
  endpoint: "",
  endpointAuthToken: "",
  allowDirectFallback: false,
  allowClientDirectInProduction: false,
};

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function normalizeTransport(value) {
  if (ALLOWED_AI_CHAT_TRANSPORTS.has(value)) return value;
  return AI_CHAT_TRANSPORT_DEFAULTS.transport;
}

export function getAiChatTransportConfig(overrides = {}) {
  const fromExtra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  const transport = normalizeTransport(
    overrides.transport ??
      fromExtra.aiChatTransport ??
      AI_CHAT_TRANSPORT_DEFAULTS.transport
  );
  const allowDirectFallback =
    parseBoolean(
      overrides.allowDirectFallback,
      parseBoolean(
        fromExtra.aiChatAllowDirectFallback,
        __DEV__
      )
    ) ?? __DEV__;
  const allowClientDirectInProduction =
    parseBoolean(
      overrides.allowClientDirectInProduction,
      parseBoolean(
        fromExtra.aiChatAllowClientDirectInProduction,
        AI_CHAT_TRANSPORT_DEFAULTS.allowClientDirectInProduction
      )
    ) ?? AI_CHAT_TRANSPORT_DEFAULTS.allowClientDirectInProduction;
  const endpoint =
    overrides.endpoint ??
    fromExtra.aiChatEndpoint ??
    AI_CHAT_TRANSPORT_DEFAULTS.endpoint;
  const endpointBearerToken =
    overrides.endpointBearerToken ??
    overrides.endpointAuthToken ??
    fromExtra.aiChatEndpointBearerToken ??
    fromExtra.aiChatEndpointAuthToken ??
    AI_CHAT_TRANSPORT_DEFAULTS.endpointAuthToken;

  return {
    transport,
    endpoint,
    endpointBearerToken,
    // Backward-compatible alias for existing call sites.
    endpointAuthToken: endpointBearerToken,
    allowDirectFallback,
    allowClientDirectInProduction,
  };
}

export function validateAiChatTransportConfig(config) {
  const errors = [];
  const transport = normalizeTransport(config?.transport);
  const endpoint = String(config?.endpoint || "").trim();
  const allowClientDirectInProduction = !!config?.allowClientDirectInProduction;

  if (
    (transport === AI_CHAT_TRANSPORTS.EDGE_FUNCTION ||
      transport === AI_CHAT_TRANSPORTS.BACKEND_ENDPOINT) &&
    !endpoint
  ) {
    errors.push("Endpoint is required for non-direct AI chat transports.");
  }

  if (
    !__DEV__ &&
    transport === AI_CHAT_TRANSPORTS.OPENAI_DIRECT &&
    !allowClientDirectInProduction
  ) {
    errors.push("Client-direct transport is disabled in production.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default getAiChatTransportConfig;
