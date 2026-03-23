/**
 * Matchmaking scenario presets (temperature, token budget for the completion).
 * Templates referenced here must exist in your prompt/template layer.
 */
export const AI_SCENARIOS = {
  standardMatching: {
    name: "Standard Matching",
    description: "General DJ-opportunity matching",
    template: "standardMatching",
    maxTokens: 3000,
    temperature: 0.7,
  },

  festivalMatching: {
    name: "Festival Matching",
    description: "Specialized for festival and large events",
    template: "festivalMatching",
    maxTokens: 3500,
    temperature: 0.6,
  },

  undergroundMatching: {
    name: "Underground Matching",
    description: "Focused on underground and intimate venues",
    template: "undergroundMatching",
    maxTokens: 3000,
    temperature: 0.8,
  },

  corporateMatching: {
    name: "Corporate Matching",
    description: "Professional and corporate events",
    template: "corporateMatching",
    maxTokens: 2500,
    temperature: 0.5,
  },

  newDJMatching: {
    name: "New DJ Matching",
    description: "Beginner-friendly opportunities",
    template: "newDJMatching",
    maxTokens: 2500,
    temperature: 0.7,
  },

  internationalMatching: {
    name: "International Matching",
    description: "Cross-border and international opportunities",
    template: "internationalMatching",
    maxTokens: 3500,
    temperature: 0.6,
  },
};
