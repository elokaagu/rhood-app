# Mix Upload Setup Checklist

Quick setup guide for enabling mix uploads in the Rhood App.

## ✅ Setup Checklist

### 1. Supabase Storage Bucket
- [ ] Go to Supabase Dashboard → Storage
- [ ] Click "New Bucket"
- [ ] Name: `mixes`
- [ ] Public bucket: ✅ Yes
- [ ] File size limit: 500 MB
- [ ] Allowed MIME types: `audio/*`
- [ ] Click "Create bucket"

### 2. Database Schema
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `database/create-mixes-table.sql`
- [ ] Run the SQL script
- [ ] Verify `mixes` table is created

### 3. Storage Policies
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `database/create-mixes-storage-bucket.sql`
- [ ] Run the SQL script
- [ ] Verify policies are created

### 4. Test the Feature
- [ ] Rebuild the app (push notifications will still be disabled)
- [ ] Navigate to Profile screen
- [ ] Look for green "Upload Mix" button
- [ ] Tap the button
- [ ] Select an audio file
- [ ] Fill in mix details
- [ ] Upload!

## 📋 Quick SQL Scripts

### Create Mixes Table
```sql
-- Run in Supabase SQL Editor
-- Full script in: database/create-mixes-table.sql
```

### Create Storage Policies
```sql
-- Run in Supabase SQL Editor
-- Full script in: database/create-mixes-storage-bucket.sql
```

## 🎯 Expected Result

After setup, users can:
- ✅ Tap "Upload Mix" button on profile
- ✅ Select audio files from device
- ✅ Add title, description, genre
- ✅ Set public/private visibility
- ✅ Upload files up to 500MB
- ✅ See upload progress
- ✅ Get success confirmation

## 🐛 Quick Troubleshooting

**Issue**: "Upload Failed"
- ✅ Check storage bucket exists
- ✅ Verify policies are configured
- ✅ Ensure user is logged in

**Issue**: "File Too Large"
- ✅ Max size is 500MB
- ✅ Compress audio file

**Issue**: Can't see upload button
- ✅ Make sure you're on Profile screen
- ✅ Rebuild the app
- ✅ Check you're logged in

## 📁 File Structure After Upload

```
Supabase Storage: mixes/
├── {user_id_1}/
│   ├── 1234567890.mp3
│   └── 1234567891.wav
└── {user_id_2}/
    └── 1234567892.mp3

Database: mixes table
├── id: uuid
├── user_id: uuid
├── title: text
├── file_url: text
└── ... other metadata
```

## ⚡ Quick Test

1. Open app
2. Go to Profile
3. Tap "Upload Mix"
4. Select test audio file
5. Enter title: "Test Mix"
6. Tap "Upload Mix"
7. Wait for success message
8. Check Supabase Storage for file
9. Check database for record

## 📞 Need Help?

- 📖 Full guide: `docs/MIX_UPLOAD_GUIDE.md`
- 🗄️ Database schema: `database/create-mixes-table.sql`
- 🔒 Storage policies: `database/create-mixes-storage-bucket.sql`
- 💻 Upload component: `components/UploadMixScreen.js`

---

**Setup time**: ~5 minutes
**Complexity**: Easy
**Dependencies**: Supabase Storage + Database

Ready to upload! 🎵🚀

