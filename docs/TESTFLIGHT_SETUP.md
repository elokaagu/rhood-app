# 🍎 TestFlight Setup Guide for R/HOOD App

Complete guide for setting up TestFlight distribution with your Apple Developer account.

## 📋 Apple Developer Account Details

- **Apple ID**: `eloka@satellitelabs.xyz`
- **Team ID**: `228556876`
- **DUNS**: `228556876`
- **Bundle ID**: `com.rhoodapp.mobile`

## 🚀 Step-by-Step TestFlight Setup

### 1. Apple Developer Console Setup

#### A. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with `eloka@satellitelabs.xyz`
3. Click "My Apps" → "+" → "New App"
4. Fill in the details:
   - **Platform**: iOS
   - **Name**: R/HOOD
   - **Primary Language**: English
   - **Bundle ID**: `com.rhoodapp.mobile`
   - **SKU**: `rhoodapp-ios-001`

#### B. Configure App Information

- **App Name**: R/HOOD
- **Subtitle**: DJ Matchmaking Platform
- **Category**: Music
- **Content Rights**: No
- **Age Rating**: Complete the questionnaire

### 2. EAS Build Configuration

Your `eas.json` is already configured with:

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "ios": {
        "appleTeamId": "228556876"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "eloka@satellitelabs.xyz",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "228556876"
      }
    }
  }
}
```

### 3. Build for TestFlight

#### A. Create Production Build

```bash
# Build for iOS production
eas build --platform ios --profile production

# This will:
# - Create a production build
# - Sign with your Apple Developer certificate
# - Upload to App Store Connect
```

#### B. Submit to TestFlight

```bash
# Submit the build to TestFlight
eas submit --platform ios --profile production

# This will:
# - Upload the build to App Store Connect
# - Process for TestFlight distribution
# - Make it available for internal testing
```

### 4. TestFlight Configuration

#### A. Internal Testing Setup

1. In App Store Connect, go to your app
2. Click "TestFlight" tab
3. Click "Internal Testing"
4. Add testers:
   - Email: `eloka@satellitelabs.xyz`
   - Role: Admin

#### B. External Testing Setup (Optional)

1. Click "External Testing"
2. Create a new group: "Beta Testers"
3. Add external testers
4. Submit for Apple Review (required for external testing)

### 5. Required App Store Connect App ID

**Important**: You need to get the App Store Connect App ID and update your `eas.json`:

1. In App Store Connect, go to your app
2. Look for the App ID (it's a number like `1234567890`)
3. Update your `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "eloka@satellitelabs.xyz",
        "ascAppId": "1234567890", // Replace with your actual App ID
        "appleTeamId": "228556876"
      }
    }
  }
}
```

## 🔧 Commands to Run

### 1. Build Production iOS App

```bash
eas build --platform ios --profile production
```

### 2. Submit to TestFlight

y

```bash
eas submit --platform ios --profile production
```

### 3. Check Build Status

```bash
eas build:list
```

### 4. Check Submission Status

```bash
eas submit:list
```

## 📱 TestFlight Features

### What TestFlight Provides:

- **Internal Testing**: Up to 100 internal testers
- **External Testing**: Up to 10,000 external testers
- **Beta App Review**: Apple reviews external testing builds
- **Crash Reports**: Automatic crash reporting
- **Test Notes**: Add release notes for testers
- **Feedback**: Collect feedback from testers

### Testing Workflow:

1. **Build** → Create production build
2. **Submit** → Upload to App Store Connect
3. **Test** → Distribute to TestFlight testers
4. **Feedback** → Collect and address feedback
5. **Release** → Submit for App Store review

## 🚨 Important Notes

### Prerequisites:

- ✅ Apple Developer Program membership ($99/year)
- ✅ Valid Apple Developer certificate
- ✅ App Store Connect access
- ✅ EAS CLI installed and configured

### Common Issues:

1. **Certificate Issues**: Run `eas credentials` to manage certificates
2. **Bundle ID Mismatch**: Ensure bundle ID matches in app.json and App Store Connect
3. **Team ID Issues**: Verify Team ID is correct in eas.json
4. **App Store Connect App ID**: Must be updated in eas.json

### Security:

- Never commit Apple Developer credentials to git
- Use EAS credentials management
- Keep certificates secure

## 📊 Monitoring and Analytics

### TestFlight Analytics:

- **Installation Rate**: How many testers install
- **Crash Rate**: App stability metrics
- **Session Duration**: How long testers use the app
- **Feedback Quality**: Rating and comments

### EAS Dashboard:

- Monitor build status
- View submission history
- Check for errors
- Manage credentials

## 🎯 Next Steps

1. **Get App Store Connect App ID** from your app in App Store Connect
2. **Update eas.json** with the correct App ID
3. **Run production build**: `eas build --platform ios --profile production`
4. **Submit to TestFlight**: `eas submit --platform ios --profile production`
5. **Configure testers** in App Store Connect
6. **Start testing** with your team

## 📞 Support

If you encounter issues:

- Check EAS documentation: https://docs.expo.dev/build/introduction/
- Apple Developer Support: https://developer.apple.com/support/
- EAS Support: https://expo.dev/support

---

**Ready to launch R/HOOD on TestFlight!** 🚀
