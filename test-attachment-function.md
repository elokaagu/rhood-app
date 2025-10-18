# Attachment Function Test Guide

## ✅ What's Implemented

### 1. **Attachment Button UI**

- ✅ Green circular button with "+" icon
- ✅ Positioned to the left of message input
- ✅ Proper styling with R/HOOD theme
- ✅ Disabled state when uploading

### 2. **Media Picker Modal**

- ✅ Dark themed modal with green accents
- ✅ Four media type options:
  - 📸 **Photo** - Images from gallery
  - 🎥 **Video** - Videos from gallery (up to 250MB)
  - 🎵 **Audio** - Audio files (up to 250MB)
  - 📄 **Document** - Files (up to 25MB)
- ✅ Cancel button to close modal

### 3. **Multimedia Service**

- ✅ **Image Upload**: Gallery selection with editing
- ✅ **Video Upload**: Gallery selection with 250MB limit
- ✅ **Audio Upload**: File picker with 250MB limit
- ✅ **Document Upload**: File picker with 25MB limit
- ✅ **Supabase Storage**: Files uploaded to `message-media` bucket
- ✅ **Error Handling**: Comprehensive error messages
- ✅ **File Validation**: Size limits and type checking

### 4. **Message Integration**

- ✅ **Preview**: Selected media shows preview before sending
- ✅ **Database Storage**: Media URLs stored in messages table
- ✅ **Real-time Updates**: Both users see multimedia messages
- ✅ **Send Logic**: Media included in message data

### 5. **Permissions & Configuration**

- ✅ **iOS Permissions**: Camera, Photo Library, Microphone, Notifications
- ✅ **Android Permissions**: Storage, Camera, Internet
- ✅ **Package Installation**: All required Expo packages installed

## 🧪 Test Steps

### **Test 1: Basic Attachment Flow**

1. Open individual chat with connected user
2. Tap the green "+" button
3. Verify modal opens with 4 options
4. Tap "Photo" option
5. Select an image from gallery
6. Verify image preview appears
7. Type a message and send
8. Verify message appears with image

### **Test 2: Different Media Types**

1. Test **Photo**: Select image, verify preview and send
2. Test **Video**: Select video, verify preview and send
3. Test **Audio**: Select audio file, verify preview and send
4. Test **Document**: Select document, verify preview and send

### **Test 3: Error Handling**

1. Try uploading file larger than limits
2. Cancel media selection
3. Test without permissions
4. Verify appropriate error messages

### **Test 4: Real-time Updates**

1. Send multimedia message from User A
2. Verify User B receives it immediately
3. Send multimedia message from User B
4. Verify User A receives it immediately

## 🔍 Debug Information

### **Console Logs to Look For:**

```
📸 Starting image upload process...
✅ Image uploaded successfully: {url, filename, size, mimeType}
💬 New individual message received: {message with media_url}
📨 Adding message to UI: {transformed message}
```

### **Database Verification:**

```sql
-- Check messages with media
SELECT
  id,
  content,
  message_type,
  media_url,
  media_filename,
  media_size,
  created_at
FROM messages
WHERE message_type != 'text'
ORDER BY created_at DESC
LIMIT 10;
```

### **Storage Verification:**

- Check Supabase Storage → `message-media` bucket
- Verify files are uploaded with proper naming
- Check file sizes match expectations

## 🚨 Potential Issues

### **1. Expo Go Limitations**

- Some native modules may not work in Expo Go
- Solution: Use development build for full functionality

### **2. Permission Issues**

- iOS: Check Settings → Privacy & Security
- Android: Check app permissions in device settings

### **3. File Size Limits**

- Videos: 250MB max
- Audio: 250MB max
- Documents: 25MB max
- Images: No explicit limit (handled by quality settings)

### **4. Network Issues**

- Large files may timeout on slow connections
- Supabase storage may have upload limits

## ✅ Expected Behavior

**When working correctly:**

1. Tap "+" → Modal opens instantly
2. Select media type → File picker opens
3. Choose file → Preview appears immediately
4. Send message → File uploads and message appears
5. Recipient sees message with media immediately
6. Media is clickable/viewable in chat

**The attachment function should be fully functional for all supported media types!** 🎉
