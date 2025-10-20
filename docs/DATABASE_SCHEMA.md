# R/HOOD App - Database Schema Documentation

## 🗄️ Overview

The R/HOOD app uses Supabase (PostgreSQL) as its backend database. This document provides comprehensive documentation of the database schema, relationships, and API functions.

## 🏗️ Database Architecture

### Technology Stack
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with JWT
- **Real-time**: Supabase Realtime subscriptions
- **Security**: Row Level Security (RLS) policies
- **Storage**: Supabase Storage for files

---

## 📊 Core Tables

### user_profiles
**Purpose**: Store DJ and user profile information

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  dj_name VARCHAR(100),
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  bio TEXT,
  location VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  instagram VARCHAR(255),
  soundcloud VARCHAR(255),
  genres TEXT[], -- Array of genre strings
  profile_image_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  primary_mix_id UUID REFERENCES mixes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields**:
- `id`: Primary key, linked to Supabase Auth
- `dj_name`: Professional DJ name
- `genres`: Array of music genres
- `primary_mix_id`: Reference to user's featured mix
- `profile_image_url`: Profile photo URL

**Indexes**:
```sql
CREATE INDEX idx_user_profiles_dj_name ON user_profiles(dj_name);
CREATE INDEX idx_user_profiles_location ON user_profiles(city, country);
CREATE INDEX idx_user_profiles_genres ON user_profiles USING GIN(genres);
```

---

### connections
**Purpose**: User relationships and networking

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  connected_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  connection_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, connected_user_id)
);
```

**Status Values**:
- `pending`: Connection request sent, awaiting response
- `accepted`: Connection established
- `rejected`: Connection request declined

---

### message_threads
**Purpose**: Chat conversation organization

```sql
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'individual' or 'group'
  user_id_1 UUID REFERENCES user_profiles(id),
  user_id_2 UUID REFERENCES user_profiles(id),
  community_id UUID REFERENCES communities(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Thread Types**:
- `individual`: Direct messages between two users
- `group`: Community/group chat messages

---

### messages
**Purpose**: Individual chat messages

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'audio', 'file'
  media_url TEXT,
  media_filename VARCHAR(255),
  media_size BIGINT,
  media_mime_type VARCHAR(100),
  thumbnail_url TEXT,
  file_extension VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Message Types**:
- `text`: Plain text messages
- `image`: Image attachments
- `audio`: Audio file attachments
- `file`: Document attachments

---

### communities
**Purpose**: DJ groups and communities

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  is_public BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### community_posts
**Purpose**: Group chat messages in communities

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  media_filename VARCHAR(255),
  media_size BIGINT,
  media_mime_type VARCHAR(100),
  thumbnail_url TEXT,
  file_extension VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### community_members
**Purpose**: Community membership tracking

```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin', 'moderator'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);
```

---

### mixes
**Purpose**: DJ mixes and tracks

```sql
CREATE TABLE mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER, -- Duration in seconds
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_name VARCHAR(255),
  file_size BIGINT, -- File size in bytes
  artwork_url TEXT, -- Optional cover art
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### opportunities
**Purpose**: Job postings and gig opportunities

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE,
  location VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  payment VARCHAR(100),
  genre VARCHAR(100),
  skill_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'professional'
  requirements TEXT,
  contact_info TEXT,
  posted_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  application_deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### applications
**Purpose**: User applications to opportunities

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);
```

---

### notifications
**Purpose**: User notification system

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50), -- 'connection', 'message', 'opportunity', 'system'
  related_id UUID, -- ID of related entity (connection, message, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Notification Types**:
- `connection`: Connection requests and updates
- `message`: New messages received
- `opportunity`: Opportunity-related notifications
- `system`: App/system notifications

---

### user_settings
**Purpose**: User preferences and app settings

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  connection_notifications BOOLEAN DEFAULT true,
  opportunity_notifications BOOLEAN DEFAULT true,
  privacy_level VARCHAR(20) DEFAULT 'public', -- 'public', 'connections', 'private'
  location_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔗 Table Relationships

### Entity Relationship Diagram

```
user_profiles (1) ──→ (many) connections
user_profiles (1) ──→ (many) messages
user_profiles (1) ──→ (many) mixes
user_profiles (1) ──→ (many) opportunities
user_profiles (1) ──→ (1) user_settings

message_threads (1) ──→ (many) messages
user_profiles (1) ──→ (many) message_threads

communities (1) ──→ (many) community_posts
communities (1) ──→ (many) community_members
user_profiles (1) ──→ (many) community_members

opportunities (1) ──→ (many) applications
user_profiles (1) ──→ (many) applications

user_profiles (1) ──→ (many) notifications
```

### Key Relationships

1. **User to Connections**: One user can have many connections
2. **User to Messages**: One user can send many messages
3. **Thread to Messages**: One thread contains many messages
4. **Community to Posts**: One community has many posts
5. **Opportunity to Applications**: One opportunity receives many applications

---

## 🔐 Row Level Security (RLS)

### Security Policies

#### user_profiles
```sql
-- Users can view their own profile and public profiles
CREATE POLICY "Users can view profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR is_public = true
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### connections
```sql
-- Users can view their own connections
CREATE POLICY "Users can view own connections" ON connections
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = connected_user_id
  );

-- Users can create connection requests
CREATE POLICY "Users can create connections" ON connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update their own connections
CREATE POLICY "Users can update own connections" ON connections
  FOR UPDATE USING (
    auth.uid() = requester_id OR auth.uid() = connected_user_id
  );
```

#### messages
```sql
-- Users can view messages in their threads
CREATE POLICY "Users can view thread messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = messages.thread_id
      AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
    )
  );

-- Users can insert messages in their threads
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = messages.thread_id
      AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
    )
  );
```

#### mixes
```sql
-- Users can view public mixes and their own mixes
CREATE POLICY "Users can view mixes" ON mixes
  FOR SELECT USING (
    auth.uid() = user_id OR is_public = true
  );

-- Users can insert their own mixes
CREATE POLICY "Users can insert own mixes" ON mixes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own mixes
CREATE POLICY "Users can update own mixes" ON mixes
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 📡 Database Functions

### Core Functions (lib/supabase.js)

#### User Management
```javascript
// Create user profile
await db.createUserProfile(profileData);

// Get user profile
await db.getUserProfile(userId);

// Update user profile
await db.updateUserProfile(userId, updates);

// Get public user profile
await db.getUserProfilePublic(userId);
```

#### Connections
```javascript
// Create connection request
await db.createConnection(targetUserId);

// Get user connections
await db.getUserConnections(userId);

// Update connection status
await db.updateConnectionStatus(connectionId, status);
```

#### Messaging
```javascript
// Find or create message thread
await db.findOrCreateIndividualMessageThread(user1Id, user2Id);

// Get messages for thread
await db.getMessages(threadId);

// Get group messages
await db.getGroupMessages(communityId);

// Get last messages for connections
await db.getLastMessagesForAllConnections(userId);
```

#### Mixes
```javascript
// Upload mix
await db.uploadMix(mixData);

// Get user mixes
await db.getUserMixes(userId);

// Get public mixes
await db.getPublicMixes(filters);

// Set primary mix
await db.setPrimaryMix(userId, mixId);
```

#### Notifications
```javascript
// Create notification
await db.createNotification(notificationData);

// Get user notifications
await db.getUserNotifications(userId);

// Mark notification as read
await db.markNotificationAsRead(notificationId);
```

---

## 🚀 Performance Optimizations

### Indexing Strategy
```sql
-- User profiles
CREATE INDEX idx_user_profiles_dj_name ON user_profiles(dj_name);
CREATE INDEX idx_user_profiles_location ON user_profiles(city, country);
CREATE INDEX idx_user_profiles_genres ON user_profiles USING GIN(genres);

-- Messages
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Connections
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_connected ON connections(connected_user_id);

-- Mixes
CREATE INDEX idx_mixes_user_id ON mixes(user_id);
CREATE INDEX idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX idx_mixes_genre ON mixes(genre);
CREATE INDEX idx_mixes_is_public ON mixes(is_public);

-- Opportunities
CREATE INDEX idx_opportunities_location ON opportunities(city, country);
CREATE INDEX idx_opportunities_genre ON opportunities(genre);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at DESC);
```

### Query Optimization
```sql
-- Optimized user search
SELECT id, dj_name, full_name, profile_image_url, city
FROM user_profiles
WHERE is_public = true
  AND (dj_name ILIKE '%search%' OR full_name ILIKE '%search%')
  AND city = 'New York'
ORDER BY dj_name
LIMIT 20;

-- Optimized message loading with user info
SELECT m.*, up.dj_name, up.profile_image_url
FROM messages m
JOIN user_profiles up ON m.sender_id = up.id
WHERE m.thread_id = $1
ORDER BY m.created_at ASC;
```

---

## 📊 Data Types and Constraints

### Newsletters and Arrays
```sql
-- Genre arrays for user profiles
genres TEXT[] -- Example: ['House', 'Techno', 'Deep House']

-- JSON for complex data
metadata JSONB -- For flexible schema extensions
```

### Validation Constraints
```sql
-- Email validation
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Status validation
ALTER TABLE connections 
ADD CONSTRAINT valid_status CHECK (connection_status IN ('pending', 'accepted', 'rejected'));

-- File size validation
ALTER TABLE mixes 
ADD CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 5368709120); -- 5GB max
```

---

## 🔄 Real-time Subscriptions

### Message Subscriptions
```javascript
// Subscribe to new messages in a thread
const channel = supabase
  .channel(`messages-${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `thread_id=eq.${threadId}`
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

### Connection Subscriptions
```javascript
// Subscribe to connection updates
const channel = supabase
  .channel(`connections-${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'connections',
    filter: `requester_id=eq.${userId}`
  }, (payload) => {
    console.log('Connection update:', payload);
  })
  .subscribe();
```

---

## 🛠️ Migration Strategy

### Version Control
```sql
-- Migration tracking table
CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example migration
INSERT INTO schema_migrations (version) VALUES ('2024-01-15-add-user-settings');
```

### Backup Strategy
- **Automated Backups**: Supabase handles daily backups
- **Point-in-time Recovery**: Available for Pro tier
- **Export Strategy**: Regular data exports for critical data

This database schema provides a solid foundation for the R/HOOD app's functionality while maintaining security, performance, and scalability.
