# Running the Rhood App

Quick guide to run your app after the recent changes.

## 🚨 Current Situation

The app has native dependencies (`expo-notifications`, `expo-document-picker`) that require either:
- **Expo Go** (limited support) ⚠️
- **Development Build** (full support) ✅

## ✅ Option 1: Use Expo Go (Quick Test)

**What works:**
- ✅ Most app features
- ✅ Mix upload UI
- ✅ File selection
- ⚠️ Upload will work if you skip push notifications

**What doesn't work:**
- ❌ Push notifications (requires dev build)

**How to run:**

1. **Start the dev server:**
   ```bash
   npx expo start --clear
   ```

2. **Scan the QR code with:**
   - iPhone: Camera app
   - Android: Expo Go app

3. **The app will open in Expo Go**

## 🚀 Option 2: Build Development Build (Full Features)

**What works:**
- ✅ ALL features
- ✅ Push notifications
- ✅ Mix uploads
- ✅ All native functionality

**How to build:**

1. **Build for iOS:**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Install on device:**
   - Wait for build to complete (~15-20 min)
   - Download and install on your iPhone
   - Open the app

3. **Start dev server:**
   ```bash
   npx expo start --dev-client
   ```

4. **Shake device** to open dev menu

## 🔧 Common Issues & Fixes

### Issue: "No development build installed"

**Solution:** Use Expo Go or build a development build

```bash
# Option A: Just use Expo Go
npx expo start

# Option B: Build development version
eas build --profile development --platform ios
```

### Issue: "Port 8081 is running"

**Solution:** Kill the existing process

```bash
pkill -f "expo start"
lsof -ti:8081 | xargs kill -9
npx expo start --clear
```

### Issue: "Could not find URI scheme"

**Solution:** This is just a warning, you can ignore it or fix it:

```bash
# To fix (optional):
npx expo prebuild
```

## 📱 Quick Start Commands

### For Daily Development (Expo Go):
```bash
# Kill any running processes
pkill -f "expo start"

# Start fresh
npx expo start --clear
```

### For Full Features (Development Build):
```bash
# Build once
eas build --profile development --platform ios

# Then daily:
npx expo start --dev-client
```

## 🎯 Current Setup Status

**Mix Upload Feature:**
- ✅ App code ready
- ✅ UI implemented
- ✅ File picker integrated
- 📋 Database needs setup (run SQL scripts)
- 📋 Storage bucket needs creation

**Push Notifications:**
- ✅ Code implemented
- ⏸️ Currently disabled (works with Expo Go)
- 🔒 Requires development build to enable

## 🛠️ Recommended Workflow

**For now (testing):**
1. Use **Expo Go**
2. Test mix upload UI
3. Setup database and storage
4. Test upload functionality

**For production:**
1. Build **development build** once
2. Enable push notifications
3. Test all features
4. Submit to TestFlight when ready

## 📊 Feature Compatibility

| Feature | Expo Go | Dev Build |
|---------|---------|-----------|
| Basic navigation | ✅ | ✅ |
| Profile screen | ✅ | ✅ |
| Mix upload UI | ✅ | ✅ |
| File selection | ✅ | ✅ |
| Supabase upload | ✅ | ✅ |
| Push notifications | ❌ | ✅ |
| All native features | ⚠️ | ✅ |

## 🎵 Testing Mix Upload

**Steps:**
1. Start app in Expo Go or dev build
2. Go to Profile screen
3. Tap "Upload Mix"
4. Select audio file
5. Fill in details
6. Upload!

**If upload fails:**
- Check Supabase connection
- Verify database tables exist
- Confirm storage bucket created

## 💡 Tips

1. **Use Expo Go for quick testing** - faster iteration
2. **Build dev build for full features** - once per major change
3. **Push notifications disabled by default** - app works fine without them
4. **Mix uploads work in both** - Expo Go and dev build

## 🆘 Need Help?

**App won't start:**
```bash
pkill -f "expo start"
npx expo start --clear
```

**Want push notifications:**
```bash
eas build --profile development --platform ios
```

**Database setup:**
- See: `docs/MIX_UPLOAD_SUMMARY.md`
- Run: `database/create-mixes-no-foreign-key.sql`

---

**Current Status:** ✅ App ready to run with Expo Go
**Recommendation:** Use Expo Go for now, build dev version when needed

