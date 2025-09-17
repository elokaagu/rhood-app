// R/HOOD AI Configuration
// Centralized configuration for AI matchmaking services

export const aiConfig = {
  // =============================================
  // API CONFIGURATION
  // =============================================
  
  providers: {
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      models: {
        'gpt-4-turbo-preview': {
          name: 'GPT-4 Turbo',
          maxTokens: 4000,
          costPer1kTokens: 0.01, // Approximate
          description: 'Most capable model for complex reasoning'
        },
        'gpt-4': {
          name: 'GPT-4',
          maxTokens: 4000,
          costPer1kTokens: 0.03,
          description: 'High-quality reasoning and analysis'
        },
        'gpt-3.5-turbo': {
          name: 'GPT-3.5 Turbo',
          maxTokens: 4000,
          costPer1kTokens: 0.002,
          description: 'Fast and cost-effective for simple tasks'
        }
      },
      headers: {
        'Authorization': 'Bearer {apiKey}',
        'Content-Type': 'application/json'
      }
    },
    
    claude: {
      name: 'Claude (Anthropic)',
      baseUrl: 'https://api.anthropic.com/v1',
      models: {
        'claude-3-opus-20240229': {
          name: 'Claude 3 Opus',
          maxTokens: 4000,
          costPer1kTokens: 0.015,
          description: 'Most powerful model for complex analysis'
        },
        'claude-3-sonnet-20240229': {
          name: 'Claude 3 Sonnet',
          maxTokens: 4000,
          costPer1kTokens: 0.003,
          description: 'Balanced performance and cost'
        },
        'claude-3-haiku-20240307': {
          name: 'Claude 3 Haiku',
          maxTokens: 4000,
          costPer1kTokens: 0.00025,
          description: 'Fast and efficient for simple tasks'
        }
      },
      headers: {
        'x-api-key': '{apiKey}',
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    }
  },

  // =============================================
  // MATCHING SCENARIOS
  // =============================================
  
  scenarios: {
    standardMatching: {
      name: 'Standard Matching',
      description: 'General DJ-opportunity matching',
      template: 'standardMatching',
      maxTokens: 3000,
      temperature: 0.7
    },
    
    festivalMatching: {
      name: 'Festival Matching',
      description: 'Specialized for festival and large events',
      template: 'festivalMatching',
      maxTokens: 3500,
      temperature: 0.6
    },
    
    undergroundMatching: {
      name: 'Underground Matching',
      description: 'Focused on underground and intimate venues',
      template: 'undergroundMatching',
      maxTokens: 3000,
      temperature: 0.8
    },
    
    corporateMatching: {
      name: 'Corporate Matching',
      description: 'Professional and corporate events',
      template: 'corporateMatching',
      maxTokens: 2500,
      temperature: 0.5
    },
    
    newDJMatching: {
      name: 'New DJ Matching',
      description: 'Beginner-friendly opportunities',
      template: 'newDJMatching',
      maxTokens: 2500,
      temperature: 0.7
    },
    
    internationalMatching: {
      name: 'International Matching',
      description: 'Cross-border and international opportunities',
      template: 'internationalMatching',
      maxTokens: 3500,
      temperature: 0.6
    }
  },

  // =============================================
  // DEFAULT SETTINGS
  // =============================================
  
  defaults: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    scenario: 'standardMatching',
    maxTokens: 3000,
    temperature: 0.7,
    maxMatches: 10,
    includeReasons: true,
    includeConfidence: true,
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  },

  // =============================================
  // RATE LIMITING
  // =============================================
  
  rateLimits: {
    openai: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000,
      requestsPerDay: 10000
    },
    claude: {
      requestsPerMinute: 50,
      tokensPerMinute: 100000,
      requestsPerDay: 5000
    }
  },

  // =============================================
  // COST TRACKING
  // =============================================
  
  costTracking: {
    enabled: true,
    maxMonthlyCost: 100, // USD
    alertThreshold: 80, // USD
    trackByUser: true,
    trackByProvider: true
  },

  // =============================================
  // CACHING CONFIGURATION
  // =============================================
  
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
    maxCacheSize: 1000, // Number of cached responses
    cacheKeyStrategy: 'user_scenario_opportunities_hash'
  },

  // =============================================
  // ERROR HANDLING
  // =============================================
  
  errorHandling: {
    fallbackToAlgorithmic: true,
    logErrors: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000 // milliseconds
  },

  // =============================================
  // ANALYTICS CONFIGURATION
  // =============================================
  
  analytics: {
    trackMatchQuality: true,
    trackUserSatisfaction: true,
    trackAIPerformance: true,
    trackCostEfficiency: true,
    generateInsights: true
  },

  // =============================================
  // SECURITY CONFIGURATION
  // =============================================
  
  security: {
    encryptApiKeys: true,
    validateApiKeys: true,
    sanitizeInputs: true,
    logApiUsage: true,
    maxRequestSize: 10000 // characters
  }
};

// =============================================
// CONFIGURATION UTILITIES
// =============================================

export const configUtils = {
  /**
   * Get provider configuration
   */
  getProvider(providerName) {
    return aiConfig.providers[providerName] || aiConfig.providers.openai;
  },

  /**
   * Get scenario configuration
   */
  getScenario(scenarioName) {
    return aiConfig.scenarios[scenarioName] || aiConfig.scenarios.standardMatching;
  },

  /**
   * Get model configuration
   */
  getModel(providerName, modelName) {
    const provider = this.getProvider(providerName);
    return provider.models[modelName] || Object.values(provider.models)[0];
  },

  /**
   * Calculate estimated cost for request
   */
  calculateCost(providerName, modelName, inputTokens, outputTokens) {
    const model = this.getModel(providerName, modelName);
    const inputCost = (inputTokens / 1000) * model.costPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.costPer1kTokens;
    return inputCost + outputCost;
  },

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.provider || !aiConfig.providers[config.provider]) {
      errors.push('Valid provider is required');
    }

    if (config.provider && !config.model) {
      errors.push('Model is required when provider is specified');
    }

    if (config.provider && config.model) {
      const provider = this.getProvider(config.provider);
      if (!provider.models[config.model]) {
        errors.push(`Model ${config.model} not available for provider ${config.provider}`);
      }
    }

    if (config.scenario && !aiConfig.scenarios[config.scenario]) {
      errors.push(`Invalid scenario: ${config.scenario}`);
    }

    if (config.maxMatches && (config.maxMatches < 1 || config.maxMatches > 50)) {
      errors.push('Max matches must be between 1 and 50');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return { ...aiConfig.defaults };
  },

  /**
   * Merge configuration with defaults
   */
  mergeWithDefaults(userConfig) {
    return {
      ...aiConfig.defaults,
      ...userConfig
    };
  },

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(aiConfig.providers).map(key => ({
      key,
      ...aiConfig.providers[key]
    }));
  },

  /**
   * Get available scenarios
   */
  getAvailableScenarios() {
    return Object.keys(aiConfig.scenarios).map(key => ({
      key,
      ...aiConfig.scenarios[key]
    }));
  },

  /**
   * Get available models for provider
   */
  getAvailableModels(providerName) {
    const provider = this.getProvider(providerName);
    return Object.keys(provider.models).map(key => ({
      key,
      ...provider.models[key]
    }));
  }
};

export default aiConfig;
