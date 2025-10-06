# Gigs and Achievements System

This document explains the gigs tracking and achievements system implemented in R/HOOD.

## 📊 Gigs Table

### Purpose
Track DJ performances, bookings, and completed events to build a performance history.

### Schema

```sql
gigs
├── id (UUID)
├── dj_id (UUID) → user_profiles.id
├── opportunity_id (UUID) → opportunities.id
├── name (VARCHAR) - Event name
├── venue (VARCHAR) - Venue name
├── location (VARCHAR) - City/address
├── event_date (DATE)
├── start_time (TIME)
├── end_time (TIME)
├── payment (DECIMAL) - Payment amount
├── currency (VARCHAR) - Default 'GBP'
├── payment_status (ENUM) - pending/paid/cancelled
├── status (ENUM) - upcoming/completed/cancelled/in_progress
├── dj_rating (DECIMAL 0.0-5.0) - Venue's rating of DJ
├── venue_rating (DECIMAL 0.0-5.0) - DJ's rating of venue
├── description (TEXT)
├── genre (VARCHAR)
├── audience_size (INTEGER)
└── notes (TEXT)
```

### Automatic Updates

**When a gig is marked as completed:**
1. ✅ Increments user's `gigs_completed` counter
2. ✅ Updates user's average `rating` based on all completed gig ratings
3. ✅ Sets `completed_at` timestamp
4. ✅ Triggers achievement checks

### Database Functions

```javascript
// Get user's gigs
const gigs = await db.getUserGigs(userId);

// Create new gig
const gig = await db.createGig({
  dj_id: userId,
  name: 'Soul Sessions #8',
  venue: 'Blue Note London',
  event_date: '2024-07-20',
  payment: 300.00,
  status: 'upcoming',
  genre: 'Soul'
});

// Update gig (e.g., mark as completed with rating)
await db.updateGig(gigId, {
  status: 'completed',
  dj_rating: 5.0
});
```

### Profile Integration

Gigs appear in the "Recent Gigs" section of user profiles:
- Shows last 5 completed gigs
- Displays venue, date, payment, and rating
- Automatically loads from database

---

## 🏆 Achievements System

### Purpose
Gamify the platform by rewarding users for milestones and accomplishments.

### Schema

**achievements** - Master list of available achievements
```sql
achievements
├── id (UUID)
├── name (VARCHAR) - e.g., "First Gig"
├── description (TEXT)
├── icon (VARCHAR) - Ionicons name
├── category (VARCHAR) - gigs/ratings/social/milestones
├── requirement_type (VARCHAR) - What to track
├── requirement_value (INTEGER) - Threshold value
├── credits_reward (INTEGER) - Credits awarded
├── sort_order (INTEGER)
└── is_active (BOOLEAN)
```

**user_achievements** - Tracks which users earned which achievements
```sql
user_achievements
├── id (UUID)
├── user_id (UUID) → user_profiles.id
├── achievement_id (UUID) → achievements.id
├── earned (BOOLEAN)
├── progress (INTEGER)
└── earned_at (TIMESTAMP)
```

### Default Achievements

| Achievement | Icon | Requirement | Reward |
|---|---|---|---|
| First Gig | trophy | Complete 1 gig | 10 credits |
| 5-Star Rating | star | Achieve 4.8+ rating | 50 credits |
| 10 Gigs | medal | Complete 10 gigs | 100 credits |
| Top Performer | ribbon | 4.9+ rating with 20+ gigs | 200 credits |
| First Mix | musical-note | Upload 1 mix | 10 credits |
| Verified Artist | checkmark-circle | Get verified | 100 credits |
| 50 Gigs | flame | Complete 50 gigs | 500 credits |
| Community Builder | people | Connect with 50+ DJs | 150 credits |

### Automatic Award System

Achievements are automatically checked and awarded when:
- User profile is updated
- Gig is completed
- Mix is uploaded
- Connections are made

```javascript
// Manually trigger achievement check
await db.checkAndAwardAchievements(userId);

// Get all achievements
const achievements = await db.getAchievements();

// Get user's earned achievements
const earned = await db.getUserAchievements(userId);
```

### Database Function

The system includes a `check_and_award_achievements()` function that:
1. ✅ Reads user stats (gigs_completed, rating, etc.)
2. ✅ Checks against achievement requirements
3. ✅ Awards new achievements automatically
4. ✅ Prevents duplicate awards
5. ✅ Awards credits to user

### Profile Integration

Achievements appear in the "Achievements" section of user profiles:
- Shows up to 4 featured achievements
- Displays earned status (colored icon vs gray)
- Automatically loads from database
- Updates in real-time when earned

---

## 🌊 Audio Waveform Generation

### Purpose
Generate visual waveform representations for audio mixes displayed on profiles.

### Features

**1. Simple Waveform**
```javascript
import { generateSimpleWaveform } from '../lib/audioWaveform';

const waveform = generateSimpleWaveform(duration, 16);
// Returns: [20, 35, 45, 30, ...]
```

**2. Genre-Based Waveform**
```javascript
import { generateGenreWaveform } from '../lib/audioWaveform';

const waveform = generateGenreWaveform(duration, 'house', 16);
// Returns genre-characteristic waveform with buildups/drops
```

**3. Audio Analysis (Advanced)**
```javascript
import { generateWaveformFromAudio } from '../lib/audioWaveform';

const waveform = await generateWaveformFromAudio(audioUrl, 16);
// Analyzes actual audio file using Web Audio API
```

### Genre Profiles

Each genre has unique waveform characteristics:

- **House/Techno**: High intensity, buildups, drops
- **R&B/Soul**: Moderate intensity, smooth variations
- **Drum & Bass**: Very high intensity, rapid changes
- **Hip-Hop**: Medium intensity, rhythmic patterns

### Usage in Profile

```javascript
// Automatic genre-based waveform
const waveform = generateGenreWaveform(
  mixData.duration || 300,
  mixData.genre || "electronic",
  16
);

primaryMix = {
  title: mixData.title,
  duration: "5:23",
  genre: mixData.genre,
  audioUrl: mixData.file_url,
  waveform: waveform // [20, 35, 45, ...]
};
```

The waveform is then rendered as animated bars in the Audio ID section of the profile.

---

## 🚀 Setup Instructions

### 1. Run Database Migrations

In your Supabase SQL Editor, run these files in order:

```sql
-- 1. Create gigs table
-- File: database/create-gigs-table.sql

-- 2. Create achievements tables
-- File: database/create-achievements-table.sql

-- 3. Add profile fields (if not already done)
-- File: database/add-profile-fields.sql
```

### 2. Verify Tables Created

```sql
-- Check gigs table
SELECT * FROM gigs LIMIT 5;

-- Check achievements
SELECT * FROM achievements;

-- Check user achievements
SELECT * FROM user_achievements;
```

### 3. Test the System

```javascript
// Create a test gig
const gig = await db.createGig({
  dj_id: user.id,
  name: 'Test Gig',
  venue: 'Test Venue',
  event_date: '2024-12-25',
  payment: 100.00,
  status: 'upcoming',
  genre: 'House'
});

// Mark it as completed
await db.updateGig(gig.id, {
  status: 'completed',
  dj_rating: 5.0
});

// Check if achievements were awarded
const achievements = await db.getUserAchievements(user.id);
console.log(achievements); // Should show "First Gig" if it's your first
```

---

## 📱 UI Integration

### Profile Screen

**Recent Gigs Section:**
- Automatically loads from `gigs` table
- Shows last 5 completed gigs
- Displays venue, date, payment, rating

**Achievements Section:**
- Automatically loads from `achievements` and `user_achievements` tables
- Shows up to 4 featured achievements
- Earned achievements show in color, unearned in gray

**Audio ID Section:**
- Displays primary mix with auto-generated waveform
- Waveform based on genre characteristics
- Visual representation of audio

### Real-Time Updates

All profile data updates automatically via Supabase real-time subscriptions:
- ✅ Gigs appear instantly when added
- ✅ Achievements show when earned
- ✅ Stats update when gigs complete
- ✅ Ratings recalculate automatically

---

## 🎯 Future Enhancements

### Potential Additions

1. **Gig Calendar View** - Visual calendar of upcoming gigs
2. **Venue Profiles** - Separate table for venues with ratings/reviews
3. **Achievement Progress** - Show progress bars (e.g., 7/10 gigs)
4. **Leaderboards** - Top DJs by rating, gigs, achievements
5. **Actual Waveform Analysis** - Process uploaded audio files server-side
6. **Social Sharing** - Share achievements on social media
7. **Gig Photos** - Upload photos from completed gigs
8. **Set Lists** - Track what was played at each gig

---

## 🔧 Troubleshooting

### Achievements Not Awarding

```sql
-- Manually run achievement check
SELECT check_and_award_achievements('USER_UUID_HERE');

-- Check user stats
SELECT rating, gigs_completed FROM user_profiles WHERE id = 'USER_UUID';
```

### Gigs Not Showing

```sql
-- Check gig ownership
SELECT * FROM gigs WHERE dj_id = 'USER_UUID';

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'gigs';
```

### Waveform Not Displaying

Check console for errors and ensure:
- Genre is valid string
- Duration is a number
- Waveform array has values

---

## 📚 Related Documentation

- [Database Setup Guide](./DATABASE_SETUP_GUIDE.md)
- [Supabase Setup](./SUPABASE_SETUP.md)
- [Profile Features](./PROFILE_FEATURES.md)
- [Platform Documentation](./PLATFORM_DOCUMENTATION.md)

