# Mix Upload Comparison: Studio vs App

## Overview
This document compares how mixes are uploaded through the R/HOOD Studio versus the R/HOOD mobile app to ensure they both connect to Supabase in the same way.

## Current App Upload Process

### 1. File Selection
```javascript
// components/UploadMixScreen.js
const pickAudioFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });
  
  const file = result.assets ? result.assets[0] : result;
  setSelectedFile(file);
}
```

### 2. File Upload to Storage
```javascript
// Convert file to blob
const fileUri = selectedFile.uri || selectedFile.fileCopyUri;
const audioResponse = await fetch(fileUri);
const audioBlob = await audioResponse.blob();

// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from("mixes")
  .upload(fileName, audioBlob, {
    contentType: selectedFile.mimeType || audioBlob.type || "audio/mpeg",
    cacheControl: "3600",
    upsert: false,
  });
```

### 3. Get Public URL
```javascript
const { data: urlData } = supabase.storage
  .from("mixes")
  .getPublicUrl(fileName);
```

### 4. Insert into Database
```javascript
const { data: mixRecord, error: dbError } = await supabase
  .from("mixes")
  .insert({
    user_id: userProfile.id,
    title: mixData.title.trim(),
    description: mixData.description.trim() || null,
    genre: mixData.genre || "Electronic",
    file_url: urlData.publicUrl,
    file_size: selectedFile.size,
    artwork_url: artworkUrl,
    is_public: mixData.isPublic,
    play_count: 0,
    likes_count: 0,
    duration: null,
  })
  .select()
  .single();
```

## Expected Database Schema

The app inserts data matching this schema:

```sql
CREATE TABLE mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  artwork_url TEXT,
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Differences to Check

### 1. File URL Format
- **Expected**: `https://[project].supabase.co/storage/v1/object/public/mixes/{user_id}/{timestamp}_{random}.{ext}`
- **Check**: Are studio URLs in the same format?

### 2. Storage Bucket
- **App uses**: `mixes` bucket
- **Check**: Does studio use the same bucket?

### 3. File Path Structure
- **App uses**: `{user_id}/{timestamp}_{random}.{ext}`
- **Check**: Does studio use the same path structure?

### 4. Database Fields
The app populates these fields:
- ✅ `user_id` - UUID from auth
- ✅ `title` - User input
- ✅ `description` - Optional user input
- ✅ `genre` - User selection or "Electronic"
- ✅ `file_url` - Public URL from storage
- ✅ `file_size` - File size in bytes
- ✅ `artwork_url` - Optional artwork URL
- ✅ `is_public` - Boolean (default true)
- ✅ `play_count` - Initialized to 0
- ✅ `likes_count` - Initialized to 0
- ⚠️ `duration` - Set to null (calculated on first play)

### 5. Storage Metadata
The app sets:
- `contentType`: Audio MIME type (e.g., "audio/mpeg")
- `cacheControl`: "3600" (1 hour)
- `upsert`: false (no overwriting)

## How to Run the Comparison

1. **Run the SQL comparison script**:
   ```bash
   # In Supabase SQL Editor, run:
   database/compare-mix-uploads.sql
   ```

2. **Check the results for**:
   - URL format differences
   - File size differences
   - Missing fields
   - Storage metadata differences
   - Path structure differences

3. **Verify storage access**:
   - Both should use the `mixes` bucket
   - Both should generate public URLs
   - Both should be accessible without authentication

## Potential Issues to Look For

### Issue 1: Different URL Formats
**Symptom**: Studio URLs work but app URLs don't
**Cause**: Different URL generation methods
**Fix**: Ensure both use `supabase.storage.from("mixes").getPublicUrl()`

### Issue 2: Missing Blob Conversion
**Symptom**: "property blob does not exist" error
**Cause**: File not converted to blob before upload
**Fix**: Already implemented - fetching URI and converting to blob

### Issue 3: Storage Bucket Permissions
**Symptom**: Some files are private/inaccessible
**Cause**: Different RLS policies or bucket settings
**Fix**: Ensure storage policies allow public read

### Issue 4: File Path Conflicts
**Symptom**: Files overwrite each other
**Cause**: Not using unique filenames
**Fix**: Already implemented - using `{timestamp}_{random}` pattern

## Next Steps

1. **Run the comparison SQL script** to see actual differences
2. **Check if studio uses a different upload method** (direct upload vs. API)
3. **Verify both methods generate the same URL format**
4. **Ensure storage bucket settings are consistent**
5. **Test playing both studio and app-uploaded mixes**

## Testing Checklist

- [ ] Run `compare-mix-uploads.sql` in Supabase
- [ ] Compare Bag Mix URL with app-uploaded mix URL
- [ ] Verify both use same bucket (`mixes`)
- [ ] Check file sizes match expectations
- [ ] Verify both have public URLs
- [ ] Test playing both types of mixes in the app
- [ ] Check artwork URLs (if applicable)
- [ ] Verify metadata completeness

## Questions to Answer

1. **Does the studio upload directly to Supabase Storage?**
   - Or does it use a different method (e.g., direct file upload, API endpoint)?

2. **What user_id does the studio use?**
   - Is it the same auth.uid() that the app uses?

3. **Does the studio set the same storage metadata?**
   - contentType, cacheControl, etc.

4. **Are there any additional fields the studio populates?**
   - That the app doesn't currently set?

## Contact Points

If differences are found, we may need to:
1. Align the app upload with studio upload
2. Or update the studio to match the app
3. Or create a unified upload API that both use

