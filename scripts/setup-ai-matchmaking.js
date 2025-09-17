#!/usr/bin/env node

/**
 * R/HOOD AI Matchmaking Setup Script
 * 
 * This script sets up the complete AI matchmaking system:
 * 1. Creates AI-specific database tables
 * 2. Sets up analytics and tracking
 * 3. Provides configuration guidance
 * 4. Tests AI integration
 * 
 * Usage: node scripts/setup-ai-matchmaking.js
 */

const fs = require('fs');
const path = require('path');

// Read the SQL files
const aiSchemaPath = path.join(__dirname, '../database/ai-matchmaking-schema.sql');
const aiSchemaSQL = fs.readFileSync(aiSchemaPath, 'utf8');

console.log('🤖 R/HOOD AI Matchmaking System Setup');
console.log('=====================================\n');

console.log('📋 Setup Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Run the following SQL commands in order:\n');

console.log('🔧 Step 1: Create AI Database Schema');
console.log('------------------------------------');
console.log('Copy and paste this SQL into your Supabase SQL Editor:\n');
console.log('```sql');
console.log(aiSchemaSQL);
console.log('```\n');

console.log('🔑 Step 2: Configure API Keys');
console.log('-----------------------------');
console.log('Set up your AI provider API keys:\n');
console.log('**OpenAI Setup:**');
console.log('1. Go to https://platform.openai.com/api-keys');
console.log('2. Create a new API key');
console.log('3. Copy the key and store it securely\n');
console.log('**Claude Setup:**');
console.log('1. Go to https://console.anthropic.com/');
console.log('2. Create a new API key');
console.log('3. Copy the key and store it securely\n');

console.log('⚙️ Step 3: Environment Configuration');
console.log('-----------------------------------');
console.log('Add these environment variables to your app:\n');
console.log('```bash');
console.log('# AI Provider API Keys');
console.log('OPENAI_API_KEY=your_openai_key_here');
console.log('CLAUDE_API_KEY=your_claude_key_here');
console.log('');
console.log('# Optional: AI Configuration');
console.log('AI_DEFAULT_PROVIDER=openai');
console.log('AI_DEFAULT_MODEL=gpt-4-turbo-preview');
console.log('AI_MAX_MONTHLY_COST=100');
console.log('```\n');

console.log('📱 Step 4: Update Your App');
console.log('--------------------------');
console.log('1. Import the AI matchmaking library:');
console.log('   import { aiMatchmaking } from "./lib/ai-matchmaking";');
console.log('');
console.log('2. Add the AIMatchmakingScreen to your navigation');
console.log('');
console.log('3. Initialize AI matching:');
console.log('   const engine = aiMatchmaking.createEngine(apiKey, provider);');
console.log('   const matches = await engine.generateAIMatches(userId);');
console.log('');

console.log('🧪 Step 5: Test AI Integration');
console.log('-----------------------------');
console.log('Test the AI system with this query:\n');
console.log('```sql');
console.log(`
-- Test AI matching session creation
INSERT INTO ai_matching_sessions (
  user_id, provider, model, scenario, configuration
) VALUES (
  'your-user-id-here',
  'openai',
  'gpt-4-turbo-preview',
  'standardMatching',
  '{"maxMatches": 5, "includeReasons": true}'
);

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_%'
ORDER BY table_name;
`);
console.log('```\n');

console.log('📊 Step 6: Monitor AI Usage');
console.log('---------------------------');
console.log('Use these queries to monitor AI usage:\n');
console.log('```sql');
console.log(`
-- View AI usage analytics
SELECT * FROM ai_usage_analytics 
WHERE user_id = 'your-user-id-here'
ORDER BY date DESC;

-- View AI model performance
SELECT * FROM get_ai_model_performance();

-- View AI matching statistics
SELECT * FROM get_ai_matching_stats('your-user-id-here');
`);
console.log('```\n');

console.log('🎯 Available AI Scenarios');
console.log('-------------------------');
console.log('The system supports these matching scenarios:\n');
console.log('• **Standard Matching** - General DJ-opportunity matching');
console.log('• **Festival Matching** - Large-scale events and festivals');
console.log('• **Underground Matching** - Intimate venues and underground scenes');
console.log('• **Corporate Matching** - Professional and corporate events');
console.log('• **New DJ Matching** - Beginner-friendly opportunities');
console.log('• **International Matching** - Cross-border opportunities\n');

console.log('🔧 Configuration Options');
console.log('------------------------');
console.log('Key configuration options available:\n');
console.log('• **Providers**: OpenAI (GPT-4, GPT-3.5) or Claude (Opus, Sonnet, Haiku)');
console.log('• **Scenarios**: 6 specialized matching scenarios');
console.log('• **Cost Tracking**: Monitor API usage and costs');
console.log('• **Rate Limiting**: Prevent API overuse');
console.log('• **Caching**: Improve performance and reduce costs');
console.log('• **Analytics**: Track match quality and user satisfaction\n');

console.log('🚀 Advanced Features');
console.log('--------------------');
console.log('The AI system includes:\n');
console.log('• **Intelligent Ranking** - AI-powered compatibility scoring');
console.log('• **Detailed Reasoning** - Explain why each match works');
console.log('• **Confidence Scoring** - Measure AI confidence in matches');
console.log('• **Career Insights** - AI-generated career advice');
console.log('• **Market Analysis** - Industry trend insights');
console.log('• **Performance Tracking** - Monitor AI model performance');
console.log('• **Feedback Loop** - Improve AI accuracy over time\n');

console.log('💡 Best Practices');
console.log('-----------------');
console.log('For optimal AI matching:\n');
console.log('• **Complete Profiles** - Ensure DJ profiles are detailed');
console.log('• **Set Preferences** - Configure matching preferences');
console.log('• **Update Availability** - Keep availability calendar current');
console.log('• **Provide Feedback** - Rate AI matches to improve accuracy');
console.log('• **Monitor Costs** - Set monthly spending limits');
console.log('• **Use Appropriate Scenarios** - Choose the right scenario for your needs\n');

console.log('🔒 Security Considerations');
console.log('-------------------------');
console.log('Security features included:\n');
console.log('• **API Key Encryption** - Secure storage of API keys');
console.log('• **Input Sanitization** - Clean user inputs');
console.log('• **Rate Limiting** - Prevent abuse');
console.log('• **Usage Logging** - Track API usage');
console.log('• **Row Level Security** - Protect user data\n');

console.log('📈 Analytics Dashboard');
console.log('---------------------');
console.log('Monitor your AI system with:\n');
console.log('• **Usage Analytics** - Track API usage and costs');
console.log('• **Performance Metrics** - Monitor AI model performance');
console.log('• **User Satisfaction** - Track match quality ratings');
console.log('• **Cost Analysis** - Monitor spending and efficiency');
console.log('• **Success Rates** - Track application success rates\n');

console.log('🎉 Setup Complete!');
console.log('==================');
console.log('Your R/HOOD AI matchmaking system is now ready!');
console.log('The system includes:');
console.log('• AI-powered DJ-opportunity matching with Claude/OpenAI');
console.log('• Intelligent ranking and compatibility scoring');
console.log('• Detailed reasoning and confidence metrics');
console.log('• Career insights and market analysis');
console.log('• Comprehensive analytics and performance tracking');
console.log('• Cost monitoring and rate limiting');
console.log('• Feedback system for continuous improvement');
console.log('');
console.log('For more information, check the documentation in the lib/ folder.');
console.log('');
console.log('🚀 Ready to revolutionize DJ matching with AI!');
