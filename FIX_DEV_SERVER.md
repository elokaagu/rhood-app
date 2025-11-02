# Fix: Expo Dev Server Port Conflict

## The Issue

Your EAS build succeeded! ✅ The app installed on the simulator, but the dev server startup failed because port 8081 is already in use by another Expo instance.

## Quick Fix

### Option 1: Kill the existing Expo process (Recommended)

```bash
# Find and kill the process using port 8081
kill $(lsof -ti:8081)
```

Then restart your dev server manually:

```bash
npx expo start --dev-client
```

### Option 2: Use a different port

```bash
npx expo start --dev-client --port 8082
```

### Option 3: Restart Metro/Expo completely

```bash
# Kill all Expo/Metro processes
pkill -f expo
pkill -f metro

# Then start fresh
npx expo start --dev-client
```

## Why This Happens

When you run `eas build`, it tries to automatically start the dev server, but if you already have an Expo dev server running (or one crashed and left a process running), it can't bind to port 8081.

## After Fixing

Once you kill the old process and start the dev server, your app should connect and work normally. The build was successful - this is just a dev server startup issue.
