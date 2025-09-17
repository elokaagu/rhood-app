# 🎯 R/HOOD Matchmaking System

Advanced AI-powered DJ-opportunity matching system for the R/HOOD underground music platform.

## 🚀 Features

### Core Matchmaking
- **AI-Powered Matching**: Intelligent algorithm that scores DJ-opportunity compatibility
- **Multi-Criteria Scoring**: Genre, skill level, location, availability, and equipment matching
- **Real-Time Updates**: Live match generation and status updates
- **Smart Filtering**: Advanced filtering based on preferences and requirements

### Brief Templates
- **Dynamic Templates**: Flexible brief generation system for different event types
- **Category-Based**: Venue, event, brand, and corporate templates
- **Variable Substitution**: Dynamic content generation with placeholders
- **Customizable**: Easy to add new templates and modify existing ones

### User Management
- **DJ Preferences**: Comprehensive preference system for matching
- **Availability Calendar**: Real-time availability management
- **Performance History**: Track gig history and ratings
- **Analytics Dashboard**: Detailed insights and statistics

### Venue & Organizer Profiles
- **Venue Database**: Comprehensive venue profiles with equipment and capacity
- **Organizer Management**: Track organizer preferences and history
- **Rating System**: Community-driven venue and organizer ratings
- **Social Integration**: Social media and contact information

## 🗄️ Database Schema

### Core Tables

#### `brief_templates`
Stores dynamic brief templates for different event types.
```sql
- id: UUID (Primary Key)
- name: VARCHAR(100) - Template name
- description: TEXT - Template description
- category: VARCHAR(50) - Template category
- template_data: JSONB - Flexible template structure
- is_active: BOOLEAN - Template status
```

#### `matching_criteria`
Defines matching criteria and their importance weights.
```sql
- id: UUID (Primary Key)
- name: VARCHAR(100) - Criteria name
- type: VARCHAR(50) - Criteria type (genre, skill_level, etc.)
- weight: DECIMAL(3,2) - Importance weight (0.0-1.0)
- is_required: BOOLEAN - Whether this criteria is mandatory
```

#### `dj_preferences`
User preferences for matching algorithm.
```sql
- id: UUID (Primary Key)
- user_id: UUID - Reference to user_profiles
- preference_type: VARCHAR(50) - Type of preference
- preference_value: JSONB - Flexible preference data
- importance_score: DECIMAL(3,2) - User-defined importance
```

#### `matches`
Generated matches between DJs and opportunities.
```sql
- id: UUID (Primary Key)
- user_id: UUID - Reference to user_profiles
- opportunity_id: UUID - Reference to opportunities
- match_score: DECIMAL(5,2) - Compatibility score (0-100)
- match_reasons: JSONB - Array of match reasons
- status: VARCHAR(20) - Match status
- expires_at: TIMESTAMP - Match expiration
```

### Supporting Tables

- **`opportunity_requirements`**: Specific requirements for each opportunity
- **`matching_algorithm_config`**: Algorithm configuration and parameters
- **`match_feedback`**: User feedback on match quality
- **`dj_availability`**: DJ availability calendar
- **`venue_profiles`**: Comprehensive venue information
- **`dj_performance_history`**: Performance tracking and ratings

## 🔧 Setup Instructions

### 1. Database Setup
```bash
# Run the setup script
node scripts/setup-matchmaking.js

# Or manually run the SQL files in Supabase:
# 1. database/matchmaking-schema.sql
# 2. database/matchmaking-seed-data.sql
```

### 2. Environment Configuration
Ensure your Supabase configuration is set up in `lib/supabase.js`:
```javascript
const supabaseUrl = "your-supabase-url";
const supabaseAnonKey = "your-supabase-anon-key";
```

### 3. Import the Library
```javascript
import { matchmaking } from './lib/matchmaking';
```

## 📱 Usage Examples

### Basic Matchmaking
```javascript
// Generate matches for a user
const matches = await matchmaking.generateMatches(userId, 20);

// Calculate specific match score
const score = await matchmaking.calculateMatchScore(userId, opportunityId);

// Get user's matches
const userMatches = await matchmaking.getMatches(userId, 'pending');
```

### DJ Preferences
```javascript
// Set user preferences
const preferences = {
  genre: {
    value: ['techno', 'house', 'deep house'],
    importance: 1.0
  },
  skill_level: {
    value: 'intermediate',
    importance: 0.8
  },
  location: {
    value: { city: 'London', max_distance: 50 },
    importance: 0.6
  }
};

await matchmaking.setDJPreferences(userId, preferences);
```

### Brief Generation
```javascript
// Get available templates
const templates = await matchmaking.getBriefTemplates('venue');

// Generate a brief from template
const brief = await matchmaking.generateBrief(templateId, {
  venue_name: 'The Underground',
  date: '2024-02-15',
  genre: 'techno',
  payment_amount: 300
});
```

### Availability Management
```javascript
// Set availability
await matchmaking.setAvailability(userId, {
  date_from: '2024-02-01T00:00:00Z',
  date_to: '2024-02-03T23:59:59Z',
  is_available: true,
  notes: 'Available for weekend gigs'
});

// Get availability
const availability = await matchmaking.getAvailability(userId, startDate, endDate);
```

## 🎯 Matching Algorithm

### Scoring System
The matching algorithm uses a weighted scoring system:

1. **Genre Compatibility (30%)**: Matches DJ genres with opportunity requirements
2. **Skill Level Match (25%)**: Ensures appropriate skill level matching
3. **Location Proximity (20%)**: Considers geographical proximity
4. **Availability (15%)**: Checks if DJ is available for the event
5. **Equipment Match (10%)**: Matches equipment requirements

### Algorithm Features
- **Threshold Filtering**: Only shows matches above 50% compatibility
- **Bonus Scoring**: Extra points for exact genre matches and same city
- **Expiration Handling**: Matches expire after 7 days
- **Real-time Updates**: Matches update when preferences change

## 📊 Analytics

### Available Metrics
- Total matches generated
- Application success rate
- Average match score
- Performance history
- Venue ratings
- User engagement metrics

### Usage
```javascript
const analytics = await matchmaking.getMatchmakingAnalytics(userId);
console.log(analytics);
// {
//   totalMatches: 25,
//   appliedMatches: 8,
//   averageMatchScore: 78.5,
//   acceptedApplications: 3,
//   recentPerformances: 5
// }
```

## 🔒 Security

### Row Level Security (RLS)
All tables have RLS policies enabled:
- Users can only access their own data
- Public read access for venue profiles and templates
- Secure match generation and management

### Data Privacy
- User preferences are private
- Match data is user-specific
- Performance history is confidential
- Venue data is public for discovery

## 🚀 Performance

### Database Indexes
Comprehensive indexing for optimal performance:
- User-based queries
- Score-based sorting
- Date range filtering
- Status-based filtering

### Caching Strategy
- Match results are cached
- Template data is cached
- User preferences are cached
- Real-time updates invalidate cache

## 🔧 Customization

### Adding New Templates
```sql
INSERT INTO brief_templates (name, description, category, template_data) VALUES
('Your Template', 'Description', 'category', '{"title": "Template with {variable}"}');
```

### Modifying Algorithm
Update the `matching_algorithm_config` table:
```sql
UPDATE matching_algorithm_config 
SET config_data = '{"weights": {"genre_compatibility": 0.35}}'
WHERE algorithm_name = 'R/HOOD Matchmaking v1.0';
```

### Adding New Criteria
```sql
INSERT INTO matching_criteria (name, type, weight, is_required) VALUES
('New Criteria', 'custom_type', 0.15, false);
```

## 📈 Monitoring

### Key Metrics to Track
- Match generation rate
- User engagement with matches
- Application success rate
- Algorithm accuracy
- System performance

### Database Queries for Monitoring
```sql
-- Daily match generation
SELECT DATE(created_at), COUNT(*) 
FROM matches 
GROUP BY DATE(created_at) 
ORDER BY DATE(created_at) DESC;

-- User engagement
SELECT status, COUNT(*) 
FROM matches 
GROUP BY status;

-- Algorithm performance
SELECT AVG(match_score), COUNT(*) 
FROM matches 
WHERE created_at > NOW() - INTERVAL '7 days';
```

## 🐛 Troubleshooting

### Common Issues

1. **No Matches Generated**
   - Check user preferences are set
   - Verify opportunities are active
   - Check algorithm configuration

2. **Low Match Scores**
   - Review matching criteria weights
   - Check user preference completeness
   - Verify opportunity requirements

3. **Performance Issues**
   - Check database indexes
   - Monitor query performance
   - Consider caching strategies

### Debug Queries
```sql
-- Check user preferences
SELECT * FROM dj_preferences WHERE user_id = 'user-id';

-- Check opportunity requirements
SELECT * FROM opportunity_requirements WHERE opportunity_id = 'opp-id';

-- Test match generation
SELECT * FROM generate_matches_for_user('user-id');
```

## 📚 API Reference

### Core Functions
- `generateMatches(userId, limit)` - Generate matches for user
- `calculateMatchScore(userId, opportunityId)` - Calculate specific match score
- `getMatches(userId, status, limit)` - Get user matches
- `updateMatchStatus(matchId, status)` - Update match status
- `applyToOpportunity(userId, opportunityId, message)` - Apply to opportunity

### Preference Management
- `getDJPreferences(userId)` - Get user preferences
- `setDJPreferences(userId, preferences)` - Set user preferences
- `getAvailability(userId, startDate, endDate)` - Get availability
- `setAvailability(userId, availability)` - Set availability

### Template System
- `getBriefTemplates(category)` - Get available templates
- `generateBrief(templateId, variables)` - Generate brief from template

### Analytics
- `getMatchmakingAnalytics(userId)` - Get user analytics
- `getPerformanceHistory(userId, limit)` - Get performance history
- `submitFeedback(matchId, userId, feedback)` - Submit match feedback

## 🤝 Contributing

### Adding New Features
1. Update database schema
2. Add corresponding JavaScript functions
3. Update RLS policies if needed
4. Add tests and documentation
5. Update seed data if necessary

### Code Style
- Use consistent naming conventions
- Add comprehensive error handling
- Include JSDoc comments
- Follow React Native best practices

## 📄 License

This matchmaking system is part of the R/HOOD platform and follows the same licensing terms.

---

For more information or support, please refer to the main R/HOOD documentation or contact the development team.
