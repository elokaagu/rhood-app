# R/HOOD App - API Reference

## 📡 Overview

This document provides comprehensive API documentation for the R/HOOD app's backend services, including Supabase database functions, authentication, and real-time subscriptions.

## 🏗️ API Architecture

### Base Configuration
- **Platform**: Supabase (PostgreSQL + REST API)
- **Authentication**: JWT-based with Row Level Security
- **Real-time**: WebSocket subscriptions
- **Storage**: Supabase Storage for files

---

## 🔐 Authentication API

### Authentication Flow
```javascript
import { supabase } from './lib/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
const { error } = await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### User Profile API

#### Create User Profile
```javascript
// POST /rest/v1/user_profiles
const { data, error } = await supabase
  .from('user_profiles')
  .insert({
    email: user.email,
    dj_name: 'DJ Example',
    full_name: 'John Doe',
    city: 'New York',
    genres: ['House', 'Techno'],
    bio: 'Underground DJ from NYC'
  })
  .select()
  .single();
```

#### Get User Profile
```javascript
// GET /rest/v1/user_profiles?id=eq.{userId}
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

#### Update User Profile
```javascript
// PATCH /rest/v1/user_profiles?id=eq.{userId}
const { data, error } = await supabase
  .from('user_profiles')
  .update({
    dj_name: 'Updated DJ Name',
    bio: 'Updated bio'
  })
  .eq('id', userId)
  .select()
  .single();
```

---

## 👥 Connections API

### Create Connection Request
```javascript
// POST /rest/v1/connections
const { data, error } = await supabase
  .from('connections')
  .insert({
    requester_id: currentUserId,
    connected_user_id: targetUserId,
    connection_status: 'pending'
  })
  .select()
  .single();
```

### Get User Connections
```javascript
// GET /rest/v1/connections?requester_id=eq.{userId}
const { data, error } = await supabase
  .from('connections')
  .select(`
    *,
    connected_user:user_profiles!connections_connected_user_id_fkey(
      id,
      dj_name,
      full_name,
      profile_image_url,
      city
    )
  `)
  .eq('requester_id', userId);
```

### Update Connection Status
```javascript
// PATCH /rest/v1/connections?id=eq.{connectionId}
const { data, error } = await supabase
  .from('connections')
  .update({ connection_status: 'accepted' })
  .eq('id', connectionId)
  .select()
  .single();
```

---

## 💬 Messaging API

### Message Threads

#### Find or Create Individual Thread
```javascript
// Custom function implementation
const findOrCreateIndividualMessageThread = async (user1Id, user2Id) => {
  const [id1, id2] = [user1Id, user2Id].sort();
  
  // Try to find existing thread
  const { data: existingThread } = await supabase
    .from('message_threads')
    .select('id')
    .eq('type', 'individual')
    .eq('user_id_1', id1)
    .eq('user_id_2', id2)
    .single();
  
  if (existingThread) return existingThread.id;
  
  // Create new thread
  const { data: newThread } = await supabase
    .from('message_threads')
    .insert({
      type: 'individual',
      user_id_1: id1,
      user_id_2: id2
    })
    .select('id')
    .single();
  
  return newThread.id;
};
```

### Messages

#### Send Message
```javascript
// POST /rest/v1/messages
const { data, error } = await supabase
  .from('messages')
  .insert({
    thread_id: threadId,
    sender_id: userId,
    content: messageContent,
    message_type: 'text'
  })
  .select()
  .single();
```

#### Get Messages for Thread
```javascript
// GET /rest/v1/messages?thread_id=eq.{threadId}
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:user_profiles!messages_sender_id_fkey(
      id,
      dj_name,
      full_name,
      profile_image_url
    )
  `)
  .eq('thread_id', threadId)
  .order('created_at', { ascending: true });
```

#### Send Multimedia Message
```javascript
// POST /rest/v1/messages
const { data, error } = await supabase
  .from('messages')
  .insert({
    thread_id: threadId,
    sender_id: userId,
    content: 'Image message',
    message_type: 'image',
    media_url: imageUrl,
    media_filename: 'image.jpg',
    media_size: fileSize,
    media_mime_type: 'image/jpeg'
  })
  .select()
  .single();
```

---

## 🎧 Mixes API

### Upload Mix
```javascript
// First upload file to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('mixes')
  .upload(`${userId}/${fileName}`, fileData, {
    contentType: 'audio/mpeg',
    cacheControl: '3600'
  });

// Then create mix record
const { data, error } = await supabase
  .from('mixes')
  .insert({
    user_id: userId,
    title: mixTitle,
    description: mixDescription,
    genre: mixGenre,
    file_url: uploadData.path,
    file_size: fileSize,
    is_public: true
  })
  .select()
  .single();
```

### Get User Mixes
```javascript
// GET /rest/v1/mixes?user_id=eq.{userId}
const { data, error } = await supabase
  .from('mixes')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Get Public Mixes
```javascript
// GET /rest/v1/mixes?is_public=eq.true
const { data, error } = await supabase
  .from('mixes')
  .select(`
    *,
    user:user_profiles!mixes_user_id_fkey(
      id,
      dj_name,
      profile_image_url
    )
  `)
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Update Mix Play Count
```javascript
// PATCH /rest/v1/mixes?id=eq.{mixId}
const { data, error } = await supabase
  .from('mixes')
  .update({ 
    play_count: supabase.sql`play_count + 1` 
  })
  .eq('id', mixId);
```

---

## 👥 Community API

### Communities

#### Get All Communities
```javascript
// GET /rest/v1/communities?is_public=eq.true
const { data, error } = await supabase
  .from('communities')
  .select('*')
  .eq('is_public', true)
  .order('created_at', { ascending: false });
```

#### Create Community
```javascript
// POST /rest/v1/communities
const { data, error } = await supabase
  .from('communities')
  .insert({
    name: communityName,
    description: communityDescription,
    created_by: userId,
    is_public: true
  })
  .select()
  .single();
```

### Community Posts

#### Send Group Message
```javascript
// POST /rest/v1/community_posts
const { data, error } = await supabase
  .from('community_posts')
  .insert({
    community_id: communityId,
    author_id: userId,
    content: messageContent,
    message_type: 'text'
  })
  .select()
  .single();
```

#### Get Community Messages
```javascript
// GET /rest/v1/community_posts?community_id=eq.{communityId}
const { data, error } = await supabase
  .from('community_posts')
  .select(`
    *,
    author:user_profiles!community_posts_author_id_fkey(
      id,
      dj_name,
      full_name,
      profile_image_url
    )
  `)
  .eq('community_id', communityId)
  .order('created_at', { ascending: true });
```

### Community Membership

#### Join Community
```javascript
// POST /rest/v1/community_members
const { data, error } = await supabase
  .from('community_members')
  .insert({
    community_id: communityId,
    user_id: userId,
    role: 'member'
  })
  .select()
  .single();
```

#### Get Community Members
```javascript
// GET /rest/v1/community_members?community_id=eq.{communityId}
const { data, error } = await supabase
  .from('community_members')
  .select(`
    *,
    user:user_profiles!community_members_user_id_fkey(
      id,
      dj_name,
      full_name,
      profile_image_url
    )
  `)
  .eq('community_id', communityId);
```

---

## 🎯 Opportunities API

### Create Opportunity
```javascript
// POST /rest/v1/opportunities
const { data, error } = await supabase
  .from('opportunities')
  .insert({
    title: opportunityTitle,
    description: opportunityDescription,
    event_date: eventDate,
    location: eventLocation,
    city: eventCity,
    genre: eventGenre,
    skill_level: 'intermediate',
    posted_by: userId,
    is_active: true
  })
  .select()
  .single();
```

### Get Opportunities
```javascript
// GET /rest/v1/opportunities?is_active=eq.true
const { data, error } = await supabase
  .from('opportunities')
  .select(`
    *,
    posted_by_user:user_profiles!opportunities_posted_by_fkey(
      id,
      dj_name,
      profile_image_url
    )
  `)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Apply to Opportunity
```javascript
// POST /rest/v1/applications
const { data, error } = await supabase
  .from('applications')
  .insert({
    opportunity_id: opportunityId,
    user_id: userId,
    message: applicationMessage,
    status: 'pending'
  })
  .select()
  .single();
```

---

## 🔔 Notifications API

### Create Notification
```javascript
// POST /rest/v1/notifications
const { data, error } = await supabase
  .from('notifications')
  .insert({
    user_id: targetUserId,
    title: notificationTitle,
    message: notificationMessage,
    type: 'connection',
    related_id: connectionId,
    is_read: false
  })
  .select()
  .single();
```

### Get User Notifications
```javascript
// GET /rest/v1/notifications?user_id=eq.{userId}
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Mark Notification as Read
```javascript
// PATCH /rest/v1/notifications?id=eq.{notificationId}
const { data, error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
  .select()
  .single();
```

---

## 📁 Storage API

### File Upload
```javascript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', fileBlob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false
  });

// Get public URL
const { data: urlData } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file.jpg');
```

### File Download
```javascript
// Download file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file.jpg');
```

### File Management
```javascript
// List files
const { data, error } = await supabase.storage
  .from('bucket-name')
  .list('folder-path');

// Delete file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/to/file.jpg']);
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
    console.log('New message received:', payload.new);
    // Update UI with new message
  })
  .subscribe();

// Cleanup subscription
supabase.removeChannel(channel);
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
    // Update connection status in UI
  })
  .subscribe();
```

### Notification Subscriptions
```javascript
// Subscribe to new notifications
const channel = supabase
  .channel(`notifications-${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification:', payload.new);
    // Show notification in UI
  })
  .subscribe();
```

---

## 🔍 Search and Filtering

### User Search
```javascript
// Search users by name and location
const { data, error } = await supabase
  .from('user_profiles')
  .select('id, dj_name, full_name, city, profile_image_url')
  .eq('is_public', true)
  .or(`dj_name.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
  .eq('city', selectedCity)
  .limit(20);
```

### Mix Search
```javascript
// Search mixes by genre and title
const { data, error } = await supabase
  .from('mixes')
  .select(`
    *,
    user:user_profiles!mixes_user_id_fkey(
      dj_name,
      profile_image_url
    )
  `)
  .eq('is_public', true)
  .eq('genre', selectedGenre)
  .ilike('title', `%${searchQuery}%`)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Opportunity Search
```javascript
// Search opportunities by location and genre
const { data, error } = await supabase
  .from('opportunities')
  .select('*')
  .eq('is_active', true)
  .eq('city', selectedCity)
  .eq('genre', selectedGenre)
  .gte('event_date', new Date().toISOString())
  .order('created_at', { ascending: false });
```

---

## ⚡ Performance Optimization

### Pagination
```javascript
// Paginated results
const PAGE_SIZE = 20;
const { data, error } = await supabase
  .from('mixes')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });
```

### Optimized Queries
```javascript
// Select only needed fields
const { data, error } = await supabase
  .from('user_profiles')
  .select('id, dj_name, profile_image_url, city')
  .eq('is_public', true)
  .limit(20);
```

### Batch Operations
```javascript
// Batch insert notifications
const notifications = [
  { user_id: 'user1', title: 'New message', type: 'message' },
  { user_id: 'user2', title: 'Connection request', type: 'connection' }
];

const { data, error } = await supabase
  .from('notifications')
  .insert(notifications);
```

---

## 🛡️ Error Handling

### Standard Error Response
```javascript
try {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profileData);
  
  if (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }
  
  return data;
} catch (error) {
  console.error('API error:', error);
  // Handle error appropriately
}
```

### Common Error Codes
- `23505`: Unique constraint violation
- `23503`: Foreign key constraint violation
- `42501`: Insufficient privileges (RLS)
- `PGRST116`: No rows found

---

## 📊 Rate Limiting

### Request Limits
- **Free Tier**: 500 requests/hour
- **Pro Tier**: 50,000 requests/hour
- **Storage**: 1GB free, 100GB Pro

### Best Practices
- Implement client-side caching
- Use pagination for large datasets
- Batch operations when possible
- Monitor API usage in dashboard

This API reference provides comprehensive documentation for all backend interactions in the R/HOOD app, ensuring consistent and reliable communication between the frontend and Supabase services.
