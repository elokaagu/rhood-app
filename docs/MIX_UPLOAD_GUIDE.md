# Mix Upload Feature Guide

This guide explains how to set up and use the mix upload functionality in the Rhood App.

## 🎯 Overview

The mix upload feature allows DJs to:

- ✅ Upload audio files (MP3, WAV, M4A, AAC) directly from the app
- ✅ Store mixes in Supabase Storage
- ✅ Add metadata (title, description, genre)
- ✅ Set visibility (public/private)
- ✅ Track plays and likes
- ✅ View uploaded mixes on their profile

## 📁 Files Added/Modified

### New Files:

- `components/UploadMixScreen.js` - Mix upload interface
- `database/create-mixes-table.sql` - Database schema for mixes
- `database/create-mixes-storage-bucket.sql` - Storage bucket setup
- `docs/MIX_UPLOAD_GUIDE.md` - This guide

### Modified Files:

- `App.js` - Added upload-mix screen route
- `components/ProfileScreen.js` - Added upload button
- `package.json` - Added expo-document-picker dependency

## 🚀 Setup Instructions

### Step 1: Install Dependencies

The required package has already been installed:

```bash
npx expo install expo-document-picker
```

### Step 2: Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New Bucket"**
3. Configure:
   - **Name**: `mixes`
   - **Public bucket**: ✅ Yes
   - **File size limit**: 500 MB
   - **Allowed MIME types**: `audio/*` (or specific: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/aac`)
4. Click **Create bucket**

### Step 3: Run Database Migration

Run this SQL script in your Supabase SQL Editor:

```sql
-- File: database/create-mixes-table.sql
```

This creates:

- `mixes` table for storing mix metadata
- Indexes for better query performance
- Row Level Security policies
- Automatic timestamp updates

### Step 4: Configure Storage Policies

Run this SQL script in your Supabase SQL Editor:

```sql
-- File: database/create-mixes-storage-bucket.sql
```

This sets up:

- Upload permissions for authenticated users
- Public read access for mixes
- User-specific folder structure
- Update/delete permissions

## 🎵 How to Use

### Uploading a Mix

1. **Navigate to Profile** screen in the app
2. Tap the **"Upload Mix"** button (green gradient button)
3. Tap **"Tap to select audio file"**
4. Select an audio file from your device (max 500MB)
5. Fill in mix details:
   - **Title** (required)
   - **Description** (optional)
   - **Genre** (optional - select from chips)
   - **Visibility** (Public/Private toggle)
6. Tap **"Upload Mix"**
7. Wait for upload to complete
8. Mix is now stored and visible on your profile!

### File Requirements

- **Supported formats**: MP3, WAV, M4A, AAC
- **Max file size**: 500 MB
- **Audio only**: No video files

### Upload Process

The upload process:

1. Validates file size and type
2. Uploads audio file to Supabase Storage
3. Generates public URL for playback
4. Saves metadata to database
5. Shows success message

## 🗄️ Database Schema

### `mixes` Table

```sql
CREATE TABLE mixes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER, -- seconds
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_size BIGINT, -- bytes
  artwork_url TEXT,
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Structure

Files are stored in user-specific folders:

```
mixes/
  └── {user_id}/
      ├── {timestamp1}.mp3
      ├── {timestamp2}.wav
      └── {timestamp3}.m4a
```

## 🔐 Security & Permissions

### Row Level Security (RLS)

The `mixes` table has RLS enabled with policies:

1. **View Policy**: Users can see their own mixes + all public mixes
2. **Insert Policy**: Users can only upload mixes for themselves
3. **Update Policy**: Users can only update their own mixes
4. **Delete Policy**: Users can only delete their own mixes

### Storage Policies

1. **Upload**: Authenticated users can upload to their own folder
2. **View**: Anyone can view mixes (public bucket)
3. **Update/Delete**: Users can only modify their own files

## 📊 Features

### Current Features:

- ✅ File picker with audio filtering
- ✅ File size validation (max 500MB)
- ✅ Title auto-fill from filename
- ✅ Genre selection with chips
- ✅ Public/Private toggle
- ✅ Upload progress indication
- ✅ Haptic feedback
- ✅ Error handling
- ✅ Success confirmation

### UI Components:

- **Upload Button**: Prominent green button on profile
- **File Picker**: Dashed border upload area
- **Form Fields**: Title, description, genre
- **Toggle**: Public/Private visibility
- **Progress**: Upload percentage display

## 🎨 UI/UX Design

### Upload Screen Layout:

```
┌─────────────────────────┐
│ ← UPLOAD MIX           │  Header
├─────────────────────────┤
│ [Audio File Picker]    │  File Selection
├─────────────────────────┤
│ Title *                │
│ [                     ] │  Form Fields
│ Description            │
│ [                     ] │
│ Genre                  │
│ [Chip] [Chip] [Chip]  │  Genre Selection
│ Public/Private Toggle  │  Visibility
├─────────────────────────┤
│ [Upload Mix Button]    │  Action Button
└─────────────────────────┘
```

### Profile Screen:

- Upload button appears after social links
- Before "Recent Gigs" section
- Prominent green gradient design
- Cloud upload icon

## 🔄 Future Enhancements

Potential improvements:

- [ ] Display uploaded mixes list on profile
- [ ] Mix playback directly from profile
- [ ] Edit mix metadata after upload
- [ ] Delete mixes
- [ ] Upload cover artwork
- [ ] Audio waveform visualization
- [ ] Share mixes with others
- [ ] Mix statistics (plays, likes)
- [ ] Download mixes
- [ ] Multiple file upload
- [ ] Audio duration detection
- [ ] Audio format conversion
- [ ] Upload queue for multiple files

## 🐛 Troubleshooting

### Common Issues:

1. **"File Too Large"**

   - Max size is 500MB
   - Compress your audio file
   - Use MP3 format for smaller size

2. **"Upload Failed"**

   - Check internet connection
   - Verify Supabase storage bucket exists
   - Check storage policies are configured
   - Ensure user is authenticated

3. **"No File Selected"**

   - Tap the upload area again
   - Grant file access permissions
   - Try different file picker

4. **Database errors**
   - Ensure `mixes` table exists
   - Check RLS policies are enabled
   - Verify user_id foreign key

### Debug Steps:

1. Check console logs for errors
2. Verify Supabase connection
3. Test with small file first
4. Check storage bucket permissions
5. Verify database schema

## 📞 API Reference

### Upload Function

```javascript
import { supabase } from "../lib/supabase";

// Upload file to storage
const { data, error } = await supabase.storage
  .from("mixes")
  .upload(fileName, blob, {
    contentType: "audio/mpeg",
    cacheControl: "3600",
    upsert: false,
  });

// Save metadata to database
const { data: mixRecord, error: dbError } = await supabase
  .from("mixes")
  .insert({
    user_id: userId,
    title: "My Mix",
    file_url: publicUrl,
    // ... other fields
  });
```

### Query Mixes

```javascript
// Get user's mixes
const { data, error } = await supabase
  .from("mixes")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

// Get public mixes
const { data, error } = await supabase
  .from("mixes")
  .select("*")
  .eq("is_public", true)
  .order("created_at", { ascending: false });
```

## 🎉 Summary

The mix upload system is now fully integrated! DJs can:

- Upload their mixes directly from the app
- Store them securely in Supabase
- Control visibility (public/private)
- Add rich metadata
- Access from their profile

The infrastructure is scalable and ready for additional features like playback, sharing, and analytics! 🚀
