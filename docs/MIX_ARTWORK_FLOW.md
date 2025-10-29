# Mix Artwork Flow Documentation

Complete guide for understanding and updating mix artwork images throughout the R/HOOD app.

## 📊 Overview

Mix artwork images are:

1. **Stored**: In Supabase Storage `mixes` bucket
2. **Referenced**: Via `artwork_url` field in the `mixes` database table
3. **Associated**: One artwork per mix (1:1 relationship)
4. **Optional**: Mixes can exist without artwork

## 🗄️ Database Structure

### `mixes` Table Schema

```sql
CREATE TABLE mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER,
  file_url TEXT NOT NULL,           -- Audio file URL
  file_name VARCHAR(255),
  file_size BIGINT,
  artwork_url TEXT,                  -- ← IMAGE URL STORED HERE
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Field: `artwork_url`

- **Type**: `TEXT` (nullable)
- **Content**: Full public URL to the image
- **Format**: `https://{project}.supabase.co/storage/v1/object/public/mixes/{user_id}/{filename}`
- **Example**: `https://xyz.supabase.co/storage/v1/object/public/mixes/abc123/artwork_1704067200.jpg`

## 📁 Storage Structure

### Supabase Storage Bucket

**Bucket Name**: `mixes`

**File Structure**:

```
mixes/
  └── {user_id}/
      ├── artwork_1704067200.jpg     ← Artwork image
      ├── artwork_1704168000.jpg
      └── 1704067200.mp3             ← Audio file
```

**Naming Convention**:

- **Artwork**: `artwork_{timestamp}.{extension}`
- **Audio**: `{timestamp}.{extension}`
- **Timestamp**: Unix timestamp in milliseconds

## 🔄 Complete Flow

### 1. **Upload Flow** (Mobile App)

```javascript
// components/UploadMixScreen.js

// Step 1: User selects artwork
const pickArtworkImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1], // Square aspect ratio
    quality: 0.8,
  });

  if (!result.canceled) {
    setSelectedArtwork(result.assets[0]);
  }
};

// Step 2: Upload artwork to Supabase
const uploadMix = async () => {
  let artworkUrl = null;

  if (selectedArtwork) {
    // Generate unique filename
    const artworkExt = selectedArtwork.name.split(".").pop() || "jpg";
    const artworkFileName = `${user.id}/artwork_${Date.now()}.${artworkExt}`;

    // Convert to Uint8Array
    const response = await fetch(selectedArtwork.uri);
    const arrayBuffer = await response.arrayBuffer();
    const artworkData = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: artworkUploadData, error } = await supabase.storage
      .from("mixes")
      .upload(artworkFileName, artworkData, {
        contentType: `image/${artworkExt}`,
        cacheControl: "3600",
        upsert: false,
      });

    if (!error) {
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("mixes")
        .getPublicUrl(artworkFileName);

      artworkUrl = urlData.publicUrl;
    }
  }

  // Step 3: Save to database
  const { data: mixRecord } = await supabase.from("mixes").insert({
    user_id: user.id,
    title: mixData.title,
    file_url: audioFileUrl,
    artwork_url: artworkUrl, // ← URL saved here
    // ... other fields
  });
};
```

### 2. **Retrieval Flow** (Mobile App)

```javascript
// components/ListenScreen.js

// Fetch mixes with artwork
const fetchMixes = async () => {
  const { data, error } = await supabase
    .from("mixes")
    .select("*")
    .order("created_at", { ascending: false });

  // Transform data includes artwork_url
  const transformedMixes = data.map((mix) => ({
    id: mix.id,
    title: mix.title,
    audioUrl: mix.file_url,
    image: mix.artwork_url || DEFAULT_ARTWORK_URL, // ← Artwork URL used
    // ... other fields
  }));
};
```

### 3. **Display Flow** (Mobile App)

```javascript
// components/DJMix.js

// Display artwork in mix card
<Image
  source={{
    uri: mix.artwork_url || "https://via.placeholder.com/300", // ← Fallback
  }}
  style={styles.albumArt}
/>
```

## 🖼️ Studio Integration

### How to Update Images from Studio

#### Option 1: Update Existing Artwork URL

```javascript
// In your studio code
const updateMixArtwork = async (mixId, newArtworkUrl) => {
  const { data, error } = await supabase
    .from("mixes")
    .update({ artwork_url: newArtworkUrl })
    .eq("id", mixId);

  return { success: !error, error };
};
```

#### Option 2: Upload New Artwork and Update

```javascript
// Complete flow for uploading new artwork
const uploadAndUpdateArtwork = async (mixId, artworkFile) => {
  const userId = user.id;
  const timestamp = Date.now();
  const fileName = `${userId}/artwork_${timestamp}.jpg`;

  // Upload to Supabase Storage
  const { data, error: uploadError } = await supabase.storage
    .from("mixes")
    .upload(fileName, artworkFile, {
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("mixes")
    .getPublicUrl(fileName);

  // Update database
  const { error: updateError } = await supabase
    .from("mixes")
    .update({ artwork_url: urlData.publicUrl })
    .eq("id", mixId);

  return {
    success: !updateError,
    error: updateError?.message,
    artworkUrl: urlData.publicUrl,
  };
};
```

## 🗃️ SQL Queries for Studio Use

### View All Mixes with Artwork

```sql
-- Get all mixes with artwork information
SELECT
  id,
  title,
  user_id,
  artwork_url,
  CASE
    WHEN artwork_url IS NULL THEN 'No artwork'
    WHEN artwork_url = '' THEN 'Empty URL'
    ELSE 'Has artwork'
  END AS artwork_status,
  file_url,
  created_at
FROM mixes
ORDER BY created_at DESC;
```

### Find Mixes Without Artwork

```sql
-- Find mixes missing artwork
SELECT
  id,
  title,
  user_id,
  created_at
FROM mixes
WHERE artwork_url IS NULL OR artwork_url = ''
ORDER BY created_at DESC;
```

### Update Artwork URL

```sql
-- Update artwork for a specific mix
UPDATE mixes
SET artwork_url = 'https://your-new-image-url.com/image.jpg'
WHERE id = 'mix-uuid-here';
```

### Bulk Update Artwork URLs

```sql
-- Update artwork for multiple mixes
UPDATE mixes
SET artwork_url = 'https://your-default-artwork.com/default.jpg'
WHERE user_id = 'user-uuid-here'
AND (artwork_url IS NULL OR artwork_url = '');
```

## 🔍 Troubleshooting

### Common Issues

#### 1. **Image Not Displaying**

**Possible Causes**:

- `artwork_url` is `NULL` or empty string
- URL is incorrect or broken
- Storage bucket permissions issue
- CORS or CDN issue

**Debug Query**:

```sql
SELECT
  id,
  title,
  artwork_url,
  LENGTH(artwork_url) as url_length
FROM mixes
WHERE id = 'your-mix-id';
```

#### 2. **Image Returns 404**

**Possible Causes**:

- File was deleted from storage
- Path is incorrect
- Bucket permissions changed

**Fix**:

```sql
-- Check if URL exists
SELECT artwork_url
FROM mixes
WHERE id = 'your-mix-id';

-- Then verify in Supabase Storage dashboard
```

#### 3. **Wrong Image Associated**

**Possible Causes**:

- Database update didn't complete
- Multiple artwork files in storage

**Fix**:

```sql
-- Verify current artwork_url
SELECT id, title, artwork_url
FROM mixes
WHERE id = 'your-mix-id';

-- Update if needed
UPDATE mixes
SET artwork_url = 'correct-url-here'
WHERE id = 'your-mix-id';
```

## 📱 Using Artwork in Components

### ListenScreen Component

```javascript
// components/ListenScreen.js

// Fetch mixes
const { data } = await supabase.from("mixes").select("*");

// Use artwork_url in transformed mix
const transformedMix = {
  id: mix.id,
  title: mix.title,
  artist: artistName,
  image: mix.artwork_url || DEFAULT_ARTWORK_URL, // ← Artwork URL
  audioUrl: mix.file_url,
};
```

### UserProfileView Component

```javascript
// components/UserProfileView.js

// Display artwork for primary mix
<ProgressiveImage
  source={{
    uri: profile.primary_mix.artwork_url || PLACEHOLDER_IMAGE,
  }}
  style={styles.mixImage}
/>
```

### Global Audio Player

```javascript
// App.js

// Show artwork in playbar
const trackData = {
  id: mix.id,
  title: mix.title,
  artist: artistName,
  image: mix.artwork_url || profile.profile_image_url || null, // ← Fallback chain
  audioUrl: mix.file_url,
};
```

## 🔐 Storage Permissions

### Bucket Policy

The `mixes` bucket should have:

```sql
-- Allow public read access
POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'mixes');
```

### File Size Limits

- **Max Size**: 10 MB per image
- **Recommended**: 1-2 MB for optimal loading
- **Formats**: JPG, PNG, WEBP

## 📊 Best Practices

### For Studio Updates

1. **Always Check if Artwork Exists**

   ```javascript
   const hasArtwork = mix.artwork_url && mix.artwork_url.length > 0;
   ```

2. **Use Fallback Images**

   ```javascript
   const imageUrl = mix.artwork_url || DEFAULT_PLACEHOLDER;
   ```

3. **Validate URLs**

   ```javascript
   const isValidUrl = (url) => {
     if (!url) return false;
     try {
       new URL(url);
       return true;
     } catch {
       return false;
     }
   };
   ```

4. **Clean Up Orphaned Files**
   ```sql
   -- Find artwork files in storage that aren't referenced
   SELECT m.artwork_url
   FROM mixes m
   WHERE m.artwork_url IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM storage.objects
     WHERE bucket_id = 'mixes'
     AND name = REGEXP_REPLACE(m.artwork_url, '.*\/mixes\/', '')
   );
   ```

## 🔗 Related Files

- **Upload Component**: `components/UploadMixScreen.js`
- **Display Component**: `components/DJMix.js`
- **Listen Screen**: `components/ListenScreen.js`
- **Profile View**: `components/UserProfileView.js`
- **App Logic**: `App.js` (global audio player)

## 📚 Additional Resources

- **Storage Guide**: `docs/MIX_UPLOAD_GUIDE.md`
- **Database Schema**: `docs/DATABASE_SCHEMA.md`
- **API Reference**: `docs/API_REFERENCE.md`

## 🎯 Quick Reference

### Database Field

- **Table**: `mixes`
- **Field**: `artwork_url`
- **Type**: TEXT (nullable)

### Storage Location

- **Bucket**: `mixes`
- **Path**: `{user_id}/artwork_{timestamp}.{ext}`

### Usage in Code

```javascript
// Get artwork
const imageUrl = mix.artwork_url;

// Display with fallback
<Image source={{ uri: mix.artwork_url || DEFAULT }} />;

// Update from studio
await supabase.from("mixes").update({ artwork_url: newUrl }).eq("id", mixId);
```

---

**Last Updated**: $(date)
**Maintained By**: R/HOOD Development Team

