# 🎯 R/HOOD Recommendation System Documentation

Complete guide to the ML-based recommendation graph system that powers shuffle, suggested DJs, and brand matching.

## 📋 Overview

The Recommendation Graph is a system that learns user preferences and creates vector embeddings to recommend DJs and mixes. It uses both explicit signals (user selections) and implicit signals (listening behavior) to build personalized recommendations.

---

## 🏗️ System Architecture

### Core Components

1. **User Embeddings** - Vector representations of user taste
2. **Mix Embeddings** - Vector representations of mix characteristics
3. **Similarity Scoring** - Cosine similarity between user and mix embeddings
4. **Behavior Tracking** - Listening sessions, completion rates, skip rates
5. **Metadata Extraction** - BPM, genre, sub-genre, mood tags, audio features

---

## 📊 Data Signals (Inputs)

### Explicit Signals

| Signal | Description | Weight |
|--------|-------------|--------|
| **Genre Preferences** | User-selected preferred genres | High |
| **Likes** | User likes a mix | Medium |
| **Saves** | User saves a mix (long-term preference) | High |

### Implicit Signals

| Signal | Description | Weight | Location |
|--------|-------------|--------|----------|
| **Listen Duration** | How long user listens | Medium | `mix_listening_sessions.listen_duration_seconds` |
| **Completion Rate** | Percentage of mix completed | High | `mix_listening_sessions.completion_percentage` |
| **Skip Rate** | How often user skips (especially < 10 seconds) | High (negative) | `mix_listening_sessions.skip_time_seconds` |
| **Replay Frequency** | How often user replays a mix | High | Calculated from sessions |
| **Time Patterns** | When user listens (time of day, day of week) | Low | `mix_listening_sessions.started_at` |
| **Geographic** | User's city/country | Medium | `user_profiles.city`, `user_profiles.country` |
| **Device Type** | iOS, Android, Web | Low | `mix_listening_sessions.device_type` |

### Quality Signals

| Signal | Description | Weight |
|--------|-------------|--------|
| **DJ Credits** | Credits earned by DJ | Medium |
| **Gigs Completed** | Number of gigs completed | Medium |
| **Mix Likes** | Total likes on mix | Low |
| **Play Count** | Total plays of mix | Low |

---

## 🎵 Mix Metadata

### Required Metadata Fields

| Field | Type | Description | Extraction Method |
|-------|------|-------------|-------------------|
| **BPM** | Integer | Beats per minute | Audio analysis library |
| **Genre** | String | Primary genre (House, Techno, etc.) | User input or ML detection |
| **Sub-genre** | String | Deep House, Melodic Techno, etc. | User input or ML detection |
| **Mood Tags** | Array | ["Upbeat", "Hypnotic", "Energetic"] | Text analysis or audio features |
| **Duration** | Integer | Length in seconds | Audio file metadata |
| **Audio Features** | JSONB | Waveform, energy, key, mode | Audio analysis |

### Metadata Extraction

**Location**: `lib/mixMetadataExtractor.js`

**Functions**:
- `extractMixMetadata()` - Main extraction function
- `detectBPM()` - BPM detection (placeholder for audio library)
- `detectGenre()` - Genre detection (placeholder for ML model)
- `extractMoodTags()` - Mood tag extraction from description/audio
- `extractAudioFeatures()` - Waveform and energy analysis

**Current Status**: Placeholder functions ready for integration with:
- Web Audio API
- Native audio analysis libraries
- Cloud ML services (AWS, Google Cloud)

---

## 🧮 Embedding Generation

### User Embeddings

**Location**: `lib/embeddingGenerator.js`

**Dimensions**:
- Genre weights (normalized by listen count and completion)
- Skip rate weights (by genre)
- Average listen duration
- Completion rate
- Preferred BPM range
- Geographic signals (city, country)
- Time patterns (peak hours, preferred days)

**Database Function**: `calculate_user_embedding(user_id)`

**Storage**: `user_embeddings` table

### Mix Embeddings

**Dimensions**:
- Genre vector (genre + sub-genre)
- BPM
- Mood vector
- Audio features (energy, key, mode)
- DJ quality score (credits, gigs, likes, plays)

**Database Function**: `calculate_mix_embedding(mix_id)`

**Storage**: `mix_embeddings` table

### Similarity Calculation

**Method**: Weighted scoring (Phase 1) → Cosine similarity (Phase 2)

**Weights**:
- Genre match: 40%
- BPM match: 20%
- Skip rate (negative): 20%
- DJ quality: 20%

**Caching**: `user_mix_similarity` table stores pre-calculated scores

---

## 🎯 Recommendation Outputs

### 1. Shuffle Recommendations

**Function**: `shuffleBasedOnLikes()`

**Method**: Weighted random sampling based on recommendation scores

**Features**:
- Ensures variety + discovery
- Higher-scored mixes appear more frequently
- Current track stays first in queue

**Location**: `App.js:2365`

### 2. Suggested DJs

**Function**: `getRecommendedMixes(userId, limit)`

**Method**: Ranked list by similarity score

**Features**:
- Top N DJs by similarity
- Excludes already-followed DJs
- Includes recency boost

**Location**: `lib/mixRecommendations.js`

### 3. "Things You May Like"

**Function**: `getRecommendedMixes()` (same as Suggested DJs)

**Display**: Horizontal carousel in Discover tab

**Content**:
- Mixes
- DJs
- New uploads from similar DJs

**Location**: `components/ConnectionsScreen.js:1783`

### 4. Brand Matching

**Future Implementation**: Weighted recommendations for brand-side AI matching

**Use Cases**:
- Match DJs to opportunities
- Suggest DJs for events
- Brand preference learning

---

## 📈 Behavior Tracking

### Listening Session Recording

**Location**: `lib/listeningBehaviorTracker.js`

**Functions**:
- `recordListeningSession()` - Record complete session
- `startListeningSession()` - Start tracking, returns end function
- `trackSkip()` - Track skip with timing
- `trackLike()` - Track like action
- `trackSave()` - Track save action

**Database Table**: `mix_listening_sessions`

**Fields Tracked**:
- User ID
- Mix ID
- Listen duration
- Completion percentage
- Skip status and timing
- Like/save status
- Device type
- Geographic location
- Timestamp

### Integration Points

**Audio Player**: Track when playback starts/ends
- `App.js` - `playGlobalAudio()` - Start session
- `App.js` - Track end via `playbackStatusUpdate` - End session

**Like Button**: Track likes
- `components/ListenScreen.js` - `handleToggleLike()` - Call `trackLike()`

**Skip Action**: Track skips
- `App.js` - skipForward/skipBackward - Call `trackSkip()`

---

## 🔄 Database Schema

### Tables

1. **mix_listening_sessions** - Behavior tracking
2. **user_embeddings** - User taste vectors
3. **mix_embeddings** - Mix characteristic vectors
4. **user_mix_similarity** - Cached similarity scores
5. **mixes** (extended) - Metadata columns (BPM, sub-genre, mood_tags, audio_features)

**Migration File**: `database-migrations/add-mix-metadata-and-recommendations.sql`

---

## 🚀 Implementation Phases

### Phase 1: Simple Weighted Scoring (Current)

- ✅ Database schema
- ✅ Behavior tracking
- ✅ Metadata extraction framework
- ✅ Simple embedding generation
- ✅ Weighted similarity scoring
- ✅ Integration with shuffle and recommendations

### Phase 2: Vector Embeddings (Future)

**Upgrade Path**:
1. Enable `pgvector` extension in Supabase
2. Generate actual vector embeddings using:
   - Pinecone
   - Weaviate
   - Supabase Vector Store
   - Custom ML model
3. Use cosine similarity for scoring
4. Implement approximate nearest neighbor search

**Benefits**:
- More accurate recommendations
- Better handling of complex patterns
- Scalable to millions of users/mixes

---

## 📝 Usage Examples

### Get Recommendations

```javascript
import { getRecommendedMixes } from './lib/mixRecommendations';

const recommendations = await getRecommendedMixes(userId, 10);
```

### Track Listening Session

```javascript
import { startListeningSession } from './lib/listeningBehaviorTracker';

const session = startListeningSession(userId, mixId);
// ... playback happens ...
await session.end({
  wasSkipped: false,
  wasLiked: true,
  mixDurationSeconds: 3600,
});
```

### Extract Metadata

```javascript
import { extractMixMetadata } from './lib/mixMetadataExtractor';

const metadata = await extractMixMetadata(audioUri, {
  genre: 'House',
  description: 'Upbeat house mix for the dancefloor',
});
```

### Generate Embeddings

```javascript
import { generateUserEmbedding, generateMixEmbedding } from './lib/embeddingGenerator';

await generateUserEmbedding(userId);
await generateMixEmbedding(mixId);
```

---

## 🔧 Configuration

### Similarity Weights

Located in `lib/embeddingGenerator.js:calculateUserMixSimilarity()`:
- Genre match: 40%
- BPM match: 20%
- Skip rate: 20%
- DJ quality: 20%

### Recommendation Limits

- Default shuffle pool: 50 mixes
- Default recommendation limit: 10 mixes
- Similarity cache TTL: Configurable (currently recalculated on demand)

---

## 📚 Related Documentation

- `database-migrations/add-mix-metadata-and-recommendations.sql` - Database schema
- `lib/mixRecommendations.js` - Recommendation engine
- `lib/embeddingGenerator.js` - Embedding generation
- `lib/listeningBehaviorTracker.js` - Behavior tracking
- `lib/mixMetadataExtractor.js` - Metadata extraction
- `docs/CREDITS_SYSTEM.md` - Credits system (affects DJ quality scores)

---

## 🎯 Future Enhancements

1. **Real-time Embedding Updates** - Recalculate embeddings as user listens
2. **A/B Testing Framework** - Test different recommendation algorithms
3. **Cold Start Problem** - Better recommendations for new users
4. **Diversity Metrics** - Ensure recommendations aren't too narrow
5. **Explainability** - Show users why mixes were recommended
6. **Brand Preferences** - Learn brand preferences for matching
7. **Mood-based Recommendations** - Time-of-day and mood matching
8. **Social Signals** - Incorporate friend/connection preferences

---

**Last Updated**: Based on current implementation
**Version**: 1.0 (Phase 1: Simple Weighted Scoring)

