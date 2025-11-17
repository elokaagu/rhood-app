# Analytics Setup Guide - Google Analytics 4 & Mixpanel

This guide explains how to set up Google Analytics 4 (via Firebase) and Mixpanel for the R/HOOD app.

## 📋 Overview

The R/HOOD app uses two analytics platforms:

- **Google Analytics 4 (GA4)** - Via Firebase Analytics
- **Mixpanel** - For advanced user behavior tracking

Both platforms are integrated through a unified analytics helper that automatically tracks user identity and events.

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
# Firebase / GA4
npx expo install @react-native-firebase/app @react-native-firebase/analytics

# Mixpanel
npm install mixpanel-react-native

# (Optional but recommended) Tracking transparency for iOS
npx expo install expo-tracking-transparency
```

### Step 2: Configure Firebase (GA4)

1. **Create Firebase Project:**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (e.g., "rhood-app")
   - Enable Google Analytics for the project

2. **Add iOS App:**

   - Click "Add app" → Select iOS
   - Enter bundle ID: `com.rhoodapp.mobile`
   - Download `GoogleService-Info.plist`
   - Place it in: `/ios/GoogleService-Info.plist`

3. **Add Android App:**

   - Click "Add app" → Select Android
   - Enter package name: `com.rhoodapp.mobile`
   - Download `google-services.json`
   - Place it in: `/android/app/google-services.json`

4. **Update app.json:**

   After downloading the config files, add them to `app.json`:

   ```json
   {
     "expo": {
       "ios": {
         "googleServicesFile": "./ios/GoogleService-Info.plist"
       },
       "android": {
         "googleServicesFile": "./android/app/google-services.json"
       },
       "plugins": ["@react-native-firebase/app"]
     }
   }
   ```

5. **Run prebuild:**

   ```bash
   npx expo prebuild
   ```

   **Note:** Don't add the `googleServicesFile` paths or `@react-native-firebase/app` plugin until you've downloaded the config files from Firebase. The app will work fine with Mixpanel only until Firebase is set up.

### Step 3: Configure Mixpanel

1. **Create Mixpanel Project:**

   - Go to [Mixpanel](https://mixpanel.com/)
   - Create a new project (e.g., "R/HOOD App")
   - Copy your Project Token

2. **Set Environment Variable:**
   - ✅ **Token is already configured in `app.json`** (for development)
   - For production, it's recommended to use EAS secrets:
     ```bash
     npx eas secret:create --scope project --name EXPO_PUBLIC_MIXPANEL_TOKEN --value "93ccc1f355ea98a1b4a34565320f6a83"
     ```
   - The analytics helper will automatically use the token from `app.json` extra or `EXPO_PUBLIC_MIXPANEL_TOKEN` environment variable

### Step 4: iOS Tracking Transparency (Optional but Recommended)

For iOS 14.5+, you should request tracking permission:

1. **Add to app.json:**

   ```json
   {
     "expo": {
       "ios": {
         "infoPlist": {
           "NSUserTrackingUsageDescription": "We use your data to improve your experience and show you relevant opportunities."
         }
       },
       "plugins": [
         [
           "expo-tracking-transparency",
           {
             "userTrackingPermission": "We use your data to improve your experience and show you relevant opportunities."
           }
         ]
       ]
     }
   }
   ```

2. **Request permission in code** (handled automatically by analytics helper)

## 📊 Analytics Events

The app tracks the following events:

### User Lifecycle

- `App Open` - When app launches
- `User Signed Up` - New user registration
- `User Logged In` - User login
- `Profile Completed` - User completes onboarding

### Content Actions

- `AudioID Uploaded` - User uploads their audio mix
- `Swipe Right` - User swipes right on opportunity
- `Swipe Left` - User swipes left on opportunity
- `Gig Viewed` - User views opportunity details
- `Gig Applied` - User applies to opportunity
- `Gig Matched` - User gets matched with opportunity
- `Gig Booked` - User books a gig
- `DM Sent` - User sends a direct message

### Custom Events

You can track custom events using:

```javascript
import { track } from "../lib/analytics";

track("Custom Event Name", {
  property1: "value1",
  property2: "value2",
});
```

## 🔍 Viewing Analytics

### Google Analytics 4

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your Firebase project
3. View real-time events: **Reports → Realtime**
4. View user properties: **Reports → User → User attributes**

### Mixpanel

1. Go to [Mixpanel Dashboard](https://mixpanel.com/)
2. Select your project
3. View live events: **Live View**
4. View user profiles: **Users → People**
5. Create funnels and insights: **Insights**

## 🧪 Testing

1. **Run the app on a device/simulator**
2. **Trigger key actions:**
   - Login/Signup
   - Swipe on opportunities
   - Apply to gigs
   - Upload audio
3. **Check analytics dashboards:**
   - GA4: Should show events in Realtime view within seconds
   - Mixpanel: Should show events in Live View with user IDs

## 🔐 Privacy & Compliance

- User IDs are set from Supabase Auth (not PII)
- Email addresses are only tracked if user is authenticated
- All tracking respects user privacy settings
- iOS tracking transparency is requested when available

## 📝 Notes

- Analytics initialization happens automatically on app launch
- User identity is synced when user logs in
- Events are tracked to both platforms simultaneously
- Failed tracking attempts are logged but don't break the app
