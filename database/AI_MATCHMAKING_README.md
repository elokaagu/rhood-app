# 🤖 R/HOOD AI Matchmaking System

Advanced AI-powered DJ-opportunity matching using Claude/OpenAI for intelligent ranking and analysis.

## 🚀 Overview

The AI Matchmaking System enhances the existing algorithmic matching with sophisticated AI analysis, providing:

- **Intelligent Ranking**: AI-powered compatibility scoring (0-100%)
- **Detailed Reasoning**: Explain why each match works
- **Confidence Metrics**: Measure AI confidence in recommendations
- **Career Insights**: AI-generated career advice and market analysis
- **Multi-Provider Support**: OpenAI (GPT-4) and Claude (Anthropic)
- **Specialized Scenarios**: 6 different matching contexts
- **Comprehensive Analytics**: Track performance, costs, and user satisfaction

## 🏗️ Architecture

### Core Components

1. **AI Matching Engine** (`lib/ai-matchmaking.js`)
   - Main AI integration service
   - Multi-provider support (OpenAI/Claude)
   - Intelligent prompt generation
   - Response parsing and validation

2. **Prompt Templates** (`lib/ai-prompt-templates.js`)
   - Specialized prompts for different scenarios
   - Dynamic template customization
   - Context-aware prompt generation

3. **Configuration System** (`lib/ai-config.js`)
   - Centralized AI configuration
   - Provider and model management
   - Cost tracking and rate limiting

4. **React Components** (`components/AIMatchmakingScreen.js`)
   - User interface for AI matching
   - Configuration management
   - Results visualization

5. **Database Schema** (`database/ai-matchmaking-schema.sql`)
   - AI session tracking
   - Results storage and analytics
   - Performance monitoring

## 🎯 AI Matching Scenarios

### 1. Standard Matching
**Use Case**: General DJ-opportunity matching
- **Focus**: Balanced analysis of all factors
- **Best For**: Most DJs and opportunities
- **AI Model**: GPT-4 Turbo or Claude Sonnet

### 2. Festival Matching
**Use Case**: Large-scale events and festivals
- **Focus**: Crowd energy, stage presence, technical requirements
- **Best For**: Experienced DJs, festival opportunities
- **AI Model**: GPT-4 Turbo (higher token limit)

### 3. Underground Matching
**Use Case**: Intimate venues and underground scenes
- **Focus**: Authenticity, scene credibility, artistic expression
- **Best For**: Underground DJs, authentic venues
- **AI Model**: Claude Sonnet (creative analysis)

### 4. Corporate Matching
**Use Case**: Professional and corporate events
- **Focus**: Professional service, brand alignment, reliability
- **Best For**: Professional DJs, corporate clients
- **AI Model**: GPT-4 (structured analysis)

### 5. New DJ Matching
**Use Case**: Beginner-friendly opportunities
- **Focus**: Learning opportunities, low-pressure environments
- **Best For**: New DJs, development-focused venues
- **AI Model**: Claude Haiku (cost-effective)

### 6. International Matching
**Use Case**: Cross-border opportunities
- **Focus**: Cultural fit, travel logistics, market understanding
- **Best For**: International DJs, global opportunities
- **AI Model**: GPT-4 Turbo (comprehensive analysis)

## 🔧 Setup Instructions

### 1. Database Setup
```bash
# Run the AI setup script
node scripts/setup-ai-matchmaking.js

# Or manually run the SQL
# database/ai-matchmaking-schema.sql
```

### 2. API Key Configuration
```javascript
// Set up API keys (store securely)
const openaiKey = 'your-openai-api-key';
const claudeKey = 'your-claude-api-key';

// Initialize AI engine
const engine = aiMatchmaking.createEngine(openaiKey, 'openai');
```

### 3. Environment Variables
```bash
# Add to your environment
OPENAI_API_KEY=your_openai_key_here
CLAUDE_API_KEY=your_claude_key_here
AI_DEFAULT_PROVIDER=openai
AI_MAX_MONTHLY_COST=100
```

## 📱 Usage Examples

### Basic AI Matching
```javascript
import { aiMatchmaking } from './lib/ai-matchmaking';

// Initialize engine
const engine = aiMatchmaking.createEngine(apiKey, 'openai');

// Generate AI matches
const matches = await engine.generateAIMatches(userId, {
  limit: 10,
  scenario: 'standardMatching',
  includeReasons: true,
  includeConfidence: true
});

// Process results
matches.forEach(match => {
  console.log(`Match: ${match.opportunity.title}`);
  console.log(`Score: ${match.compatibility_score}%`);
  console.log(`Reasoning: ${match.reasoning}`);
  console.log(`Confidence: ${match.confidence}`);
});
```

### Specialized Scenarios
```javascript
// Festival matching
const festivalMatches = await engine.generateAIMatches(userId, {
  scenario: 'festivalMatching',
  limit: 5
});

// Underground matching
const undergroundMatches = await engine.generateAIMatches(userId, {
  scenario: 'undergroundMatching',
  limit: 8
});

// Corporate matching
const corporateMatches = await engine.generateAIMatches(userId, {
  scenario: 'corporateMatching',
  limit: 6
});
```

### Career Insights
```javascript
// Generate AI career insights
const insights = await aiMatchmaking.generateInsights(userId, apiKey, 'openai');

console.log('Career Analysis:', insights.career_analysis);
console.log('Market Insights:', insights.market_insights);
console.log('Recommendations:', insights.recommendations);
```

## 🎯 AI Prompt Engineering

### Prompt Structure
Each AI matching scenario uses a structured prompt system:

1. **System Prompt**: Defines the AI's role and expertise
2. **User Prompt**: Provides specific matching data
3. **Context**: User profile, preferences, opportunities
4. **Instructions**: Specific analysis requirements
5. **Output Format**: Structured JSON response

### Example Prompt (Standard Matching)
```
System: You are an expert DJ booking agent with 15+ years of experience...

User: Please analyze and rank these DJ-opportunity matches:

## DJ PROFILE
**Name**: DJ Underground
**Location**: London
**Genres**: Techno, Deep House
**Bio**: Underground techno DJ with 5 years experience...

## PREFERENCES
- **Genre**: ["techno", "deep house"] (importance: 1.0)
- **Skill Level**: "intermediate" (importance: 0.8)
- **Location**: {"city": "London", "max_distance": 50} (importance: 0.6)

## OPPORTUNITIES
[Opportunity details...]

Return ranked matches with compatibility scores, detailed reasoning, and confidence levels.
```

## 📊 Analytics and Monitoring

### AI Usage Analytics
```sql
-- View AI usage by user
SELECT * FROM ai_usage_analytics 
WHERE user_id = 'user-id'
ORDER BY date DESC;

-- View AI model performance
SELECT * FROM get_ai_model_performance();

-- View AI matching statistics
SELECT * FROM get_ai_matching_stats('user-id');
```

### Key Metrics
- **Match Quality**: Compatibility scores and user ratings
- **AI Performance**: Response times and success rates
- **Cost Analysis**: API usage and spending
- **User Satisfaction**: Feedback and application success
- **Model Comparison**: Performance across providers

## 🔒 Security and Privacy

### Data Protection
- **API Key Encryption**: Secure storage of credentials
- **Input Sanitization**: Clean user inputs
- **Row Level Security**: Protect user data
- **Usage Logging**: Track API usage
- **Rate Limiting**: Prevent abuse

### Privacy Considerations
- **User Data**: Only necessary data sent to AI
- **Anonymization**: Remove sensitive information
- **Retention**: Configurable data retention
- **Consent**: Clear user consent for AI processing

## 💰 Cost Management

### Cost Tracking
```javascript
// Monitor costs
const analytics = await engine.getUsageAnalytics(userId);
console.log(`Total Cost: $${analytics.totalCost}`);
console.log(`This Month: $${analytics.monthlyCost}`);
```

### Cost Optimization
- **Model Selection**: Choose appropriate models
- **Caching**: Reduce redundant API calls
- **Rate Limiting**: Prevent overuse
- **Batch Processing**: Group requests efficiently
- **Cost Alerts**: Set spending limits

## 🚀 Performance Optimization

### Caching Strategy
```javascript
// Enable caching
const engine = aiMatchmaking.createEngine(apiKey, 'openai', {
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000
  }
});
```

### Rate Limiting
```javascript
// Configure rate limits
const engine = aiMatchmaking.createEngine(apiKey, 'openai', {
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000
  }
});
```

## 🔧 Configuration Options

### Provider Configuration
```javascript
const config = {
  provider: 'openai', // 'openai' or 'claude'
  model: 'gpt-4-turbo-preview',
  scenario: 'standardMatching',
  maxTokens: 3000,
  temperature: 0.7,
  maxMatches: 10,
  includeReasons: true,
  includeConfidence: true
};
```

### Advanced Options
```javascript
const advancedConfig = {
  timeout: 30000,
  retryAttempts: 3,
  fallbackToAlgorithmic: true,
  costTracking: true,
  analytics: true
};
```

## 🧪 Testing and Validation

### Test AI Integration
```javascript
// Test basic functionality
const testMatches = await aiMatchmaking.quickMatch(userId, apiKey, 'openai');

// Test specific scenario
const testScenario = await engine.generateAIMatches(userId, {
  scenario: 'festivalMatching',
  limit: 3
});
```

### Validation Queries
```sql
-- Test database setup
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ai_%';

-- Test AI session creation
INSERT INTO ai_matching_sessions (user_id, provider, model, scenario) 
VALUES ('test-user', 'openai', 'gpt-4-turbo-preview', 'standardMatching');
```

## 📈 Monitoring and Alerts

### Performance Monitoring
- **Response Times**: Track AI API response times
- **Success Rates**: Monitor successful requests
- **Error Rates**: Track and analyze failures
- **Cost Trends**: Monitor spending patterns

### Alert Configuration
```javascript
const alerts = {
  highCost: 80, // Alert at 80% of monthly limit
  highErrorRate: 0.1, // Alert at 10% error rate
  slowResponse: 10000, // Alert at 10s response time
  quotaExceeded: true
};
```

## 🔄 Continuous Improvement

### Feedback Loop
```javascript
// Submit feedback on AI matches
await engine.submitFeedback(matchId, userId, {
  feedback_type: 'accuracy',
  rating: 5,
  feedback_text: 'Perfect match!'
});
```

### Model Performance
- **A/B Testing**: Compare different models
- **Performance Tracking**: Monitor accuracy over time
- **User Satisfaction**: Track feedback and ratings
- **Cost Efficiency**: Optimize for cost vs. quality

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify API key is correct
   - Check key permissions
   - Ensure sufficient credits

2. **Rate Limiting**
   - Implement exponential backoff
   - Use caching to reduce requests
   - Monitor usage patterns

3. **High Costs**
   - Use appropriate models
   - Enable caching
   - Set spending limits
   - Optimize prompts

4. **Poor Match Quality**
   - Improve user profiles
   - Refine prompt templates
   - Collect more feedback
   - Adjust scoring weights

### Debug Queries
```sql
-- Check AI session status
SELECT * FROM ai_matching_sessions 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC;

-- View AI results
SELECT * FROM ai_matching_results 
WHERE user_id = 'user-id' 
ORDER BY compatibility_score DESC;

-- Check for errors
SELECT * FROM ai_matching_sessions 
WHERE status = 'failed';
```

## 📚 API Reference

### Core Functions
- `aiMatchmaking.createEngine(apiKey, provider)` - Create AI engine
- `engine.generateAIMatches(userId, options)` - Generate AI matches
- `engine.generateAIInsights(userId)` - Generate career insights
- `aiMatchmaking.quickMatch(userId, apiKey, provider)` - Quick matching

### Configuration
- `configUtils.getProvider(providerName)` - Get provider config
- `configUtils.getScenario(scenarioName)` - Get scenario config
- `configUtils.validateConfig(config)` - Validate configuration

### Analytics
- `engine.getUsageAnalytics(userId)` - Get usage analytics
- `engine.getPerformanceMetrics()` - Get performance metrics
- `engine.submitFeedback(matchId, userId, feedback)` - Submit feedback

## 🤝 Contributing

### Adding New Scenarios
1. Add scenario to `promptTemplates`
2. Update configuration in `ai-config.js`
3. Add database tracking if needed
4. Update documentation

### Improving Prompts
1. Analyze user feedback
2. Test different prompt variations
3. Measure performance impact
4. Update templates

### Adding New Providers
1. Add provider configuration
2. Implement API integration
3. Add error handling
4. Update documentation

## 📄 License

This AI matchmaking system is part of the R/HOOD platform and follows the same licensing terms.

---

For more information or support, please refer to the main R/HOOD documentation or contact the development team.
