# TestFlight Deployment Guide

## 🚀 Deploy Latest Changes to TestFlight

### Prerequisites

- ✅ All changes committed and pushed to GitHub
- ✅ EAS CLI installed (`npm install -g eas-cli`)
- ✅ Logged into EAS (`eas login`)

---

## Step-by-Step Process

### 1. Verify Latest Code is Pushed

```bash
# Check git status
git status

# Should show: "Your branch is up to date with 'origin/main'"
# And: "nothing to commit, working tree clean"

# Check latest commit
git log --oneline -n 1

# Should show your most recent commit
```

### 2. Build for iOS Production

```bash
# Build for TestFlight/App Store
eas build --platform ios --profile production

# This will:
# - Pull latest code from GitHub main branch
# - Increment build number automatically
# - Build with production optimizations
# - Upload to EAS servers
```

**Wait for build to complete (15-30 minutes)**

### 3. Submit to TestFlight

```bash
# Submit the latest build
eas submit --platform ios --latest

# Alternative: Submit a specific build
eas submit --platform ios --id <BUILD_ID>

# The --latest flag automatically picks the most recent successful build
```

### 4. Verify in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app: **R/HOOD**
3. Go to **TestFlight** tab
4. Check **iOS Builds** section
5. Wait for **"Processing"** to change to **"Ready to Submit"** (5-15 minutes)
6. Once ready, it will appear in TestFlight for testers

---

## 🔍 How to Verify You Have Latest Code

### Check Build Details

```bash
# List recent builds
eas build:list --platform ios --limit 5

# This shows:
# - Build ID
# - Git commit hash
# - Build status
# - Build number
```

### Compare Git Commit Hash

```bash
# Get your current commit hash
git rev-parse HEAD

# Compare with the commit hash shown in EAS build list
# They should match!
```

### Check Build Number

Each build increments the build number automatically. Check in `app.json`:

```json
{
  "expo": {
    "ios": {
      "buildNumber": "X" // This auto-increments
    }
  }
}
```

---

## ⚡ Quick Deploy Commands

### Deploy Latest Changes (Full Flow)

```bash
# 1. Ensure code is pushed
git status
git push origin main

# 2. Build for iOS
eas build --platform ios --profile production

# 3. Wait for build... ☕

# 4. Submit to TestFlight
eas submit --platform ios --latest
```

### Check Build Status

```bash
# Watch build progress
eas build:list --platform ios --limit 1

# Or view in browser
eas build:view
```

---

## 🎯 Common Scenarios

### Scenario 1: "I just pushed changes"

```bash
# Build will automatically use latest GitHub main branch
eas build --platform ios --profile production
```

### Scenario 2: "I want to submit an older build"

```bash
# List all builds
eas build:list --platform ios

# Submit specific build by ID
eas submit --platform ios --id abc-123-def-456
```

### Scenario 3: "I'm not sure which build is latest"

```bash
# Always use --latest flag
eas submit --platform ios --latest

# This submits the most recent successful build
```

### Scenario 4: "I need to rebuild without code changes"

```bash
# Just run build again
eas build --platform ios --profile production

# Each build gets a new build number even with same code
```

---

## 🔧 Build Profiles

Your `eas.json` has different build profiles:

### Production (for TestFlight/App Store)

```bash
eas build --platform ios --profile production
```

- Distribution: `store`
- Used for: TestFlight, App Store releases
- Fully optimized
- No dev tools

### Development (for testing on device)

```bash
eas build --platform ios --profile development
```

- Distribution: `internal`
- Used for: Local testing, debugging
- Includes dev tools
- Can install directly on device

---

## 📱 After Submit

### TestFlight Processing Time

1. **Upload to App Store Connect**: Immediate
2. **Processing**: 5-15 minutes
3. **Ready for Testers**: Automatic
4. **Notification to Testers**: Automatic (if enabled)

### How to Check Status

1. [App Store Connect](https://appstoreconnect.apple.com)
2. Your App → TestFlight
3. Check "Build" status:
   - ⏳ **Processing**: Wait
   - ✅ **Ready to Submit**: Available in TestFlight
   - ❌ **Missing Compliance**: Add export compliance info

---

## 🆘 Troubleshooting

### "Build uses wrong code version"

**Problem**: Build doesn't include your latest changes

**Solution**:

```bash
# Ensure changes are committed and pushed
git status
git push origin main

# Then build - EAS pulls from GitHub
eas build --platform ios --profile production
```

### "Submit failed - no builds found"

**Problem**: No successful builds available

**Solution**:

```bash
# Check build status
eas build:list --platform ios --limit 5

# Ensure you have a successful build
# Build status should be "finished" not "failed" or "in-progress"
```

### "I want to cancel a build"

```bash
# Cancel current build
eas build:cancel

# Or cancel specific build
eas build:cancel --id <BUILD_ID>
```

---

## 📊 Build Version Info

### Version vs Build Number

- **Version**: User-facing (e.g., 1.0.0) - Semantic versioning
- **Build Number**: Auto-incremented integer (e.g., 42) - Unique per build

### Where They're Used

```json
{
  "expo": {
    "version": "1.0.0", // User sees this in App Store
    "ios": {
      "buildNumber": "42" // Apple uses this to track builds
    }
  }
}
```

### Incrementing Versions

```bash
# For minor updates (new features)
# Manually update in app.json:
# 1.0.0 → 1.1.0

# For patches (bug fixes)
# 1.0.0 → 1.0.1

# Build number auto-increments on every build
```

---

## ✅ Checklist Before Deploy

- [ ] All changes committed: `git status`
- [ ] All changes pushed: `git push origin main`
- [ ] No linter errors: Check files in VS Code
- [ ] App builds locally: `npm start` works
- [ ] Ready for production: No debug code, console.logs are okay
- [ ] Version updated if needed: Check `app.json`

---

## 🎯 Quick Reference

| Command                                          | Purpose                           |
| ------------------------------------------------ | --------------------------------- |
| `eas build --platform ios --profile production`  | Build for TestFlight              |
| `eas build --platform ios --profile development` | Build for local testing           |
| `eas submit --platform ios --latest`             | Submit latest build to TestFlight |
| `eas build:list --platform ios`                  | List recent builds                |
| `eas build:view`                                 | View build in browser             |
| `eas build:cancel`                               | Cancel current build              |

---

_Last Updated: 2025-10-13_
_Latest Changes: Apple Sign-In forensic debugging, Settings toggle fixes_
