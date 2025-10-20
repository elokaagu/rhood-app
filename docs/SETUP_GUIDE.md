# R/HOOD App - Development Setup Guide

## 🚀 Quick Start

This guide will help you set up the R/HOOD app development environment from scratch.

---

## 📋 Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: Latest version
- **Expo CLI**: Latest version

### Mobile Development
- **iOS**: Xcode 14+ (for iOS development)
- **Android**: Android Studio (for Android development)
- **Expo Go App**: For testing on physical devices

---

## 🛠️ Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/elokaagu/rhood-app.git
cd rhood-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Expo CLI (if not already installed)
```bash
npm install -g @expo/cli
```

### 4. Environment Setup
Create a `.env` file in the root directory:
```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For push notifications
EXPO_PUBLIC_PUSH_NOTIFICATION_TOKEN=your_push_token
```

### 5. Start Development Server
```bash
npm start
```

---

## 🗄️ Database Setup

### 1. Supabase Project Setup
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Database Schema Setup
Run the following SQL scripts in your Supabase SQL Editor:

#### Core Tables
```sql
-- Run database/create-mixes-table.sql
-- Run database/create-message-threads-table.sql
-- Run database/create-communities-table.sql
-- Run database/create-opportunities-table.sql
```

#### Storage Buckets
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('mixes', 'mixes', true),
('message-media', 'message-media', true),
('profile-images', 'profile-images', true);
```

#### Row Level Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ... (run all RLS policies from database files)
```

### 3. Storage Policies
Set up storage policies for file uploads:
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('mixes', 'message-media', 'profile-images'));

-- Allow public access to files
CREATE POLICY "Public files are viewable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('mixes', 'message-media', 'profile-images'));
```

---

## 📱 Mobile Setup

### iOS Setup (macOS only)
1. Install Xcode from App Store
2. Install iOS Simulator
3. Run the app:
   ```bash
   npm run ios
   ```

### Android Setup
1. Install Android Studio
2. Set up Android SDK and emulator
3. Run the app:
   ```bash
   npm run android
   ```

### Physical Device Testing
1. Install Expo Go app on your device
2. Scan QR code from development server
3. App will load on your device

---

## 🔧 Development Tools

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json"
  ]
}
```

### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

---

## 🧪 Testing Setup

### Unit Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react-native @testing-library/jest-native

# Run tests
npm test
```

### E2E Testing (Optional)
```bash
# Install Detox for E2E testing
npm install --save-dev detox
```

---

## 📦 Build Configuration

### EAS Build Setup
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure build:
   ```bash
   eas build:configure
   ```

### Build Profiles
The `eas.json` file contains build configurations:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## 🔐 Authentication Setup

### Supabase Auth Configuration
1. Go to Supabase Dashboard → Authentication → Settings
2. Configure email settings
3. Set up social providers (optional)

### Apple Sign-In Setup (iOS)
1. Create Apple Developer account
2. Configure Sign in with Apple
3. Add Apple Sign-In capability to app

### Google Sign-In Setup (Android)
1. Create Google Cloud Console project
2. Enable Google Sign-In API
3. Configure OAuth credentials

---

## 🔔 Push Notifications Setup

### Expo Push Notifications
1. Configure push notification settings in `app.json`:
   ```json
   {
     "expo": {
       "notification": {
         "icon": "./assets/notification-icon.png",
         "color": "#00ff00"
       }
     }
   }
   ```

2. Set up notification handlers in your app

### APNs Setup (iOS)
1. Create Apple Push Notification certificate
2. Upload to Expo servers
3. Configure in EAS Build

### FCM Setup (Android)
1. Create Firebase project
2. Configure FCM
3. Upload server key to Expo

---

## 🎨 Brand Assets Setup

### Required Assets
Ensure these files exist in `assets/`:
- `rhood_logo.webp` - Main logo
- `rhood_logo.png` - Fallback logo
- `splash.png` - Splash screen image
- `icon.png` - App icon
- `TS Block Bold.ttf` - Custom font

### Asset Optimization
```bash
# Optimize images (optional)
npx expo install expo-image-utils

# Generate app icons
npx expo install expo-splash-screen
```

---

## 🚀 Development Workflow

### Daily Development
1. Start development server:
   ```bash
   npm start
   ```

2. Open on device/simulator:
   - Press `i` for iOS
   - Press `a` for Android
   - Scan QR code for physical device

3. Make changes and see live updates

### Code Quality
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature

# Create pull request
```

---

## 🐛 Debugging

### Common Issues

#### Metro bundler issues
```bash
# Clear Metro cache
npx expo start --clear

# Reset Metro cache
rm -rf node_modules/.cache
```

#### iOS build issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..
```

#### Android build issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..
```

### Debug Tools
- **React Native Debugger**: Standalone debugging tool
- **Flipper**: Facebook's debugging platform
- **Expo Dev Tools**: Built-in debugging tools

### Logging
```javascript
// Use console.log for debugging
console.log('Debug info:', data);

// Use remote logging in production
import { remoteLogger } from './lib/remoteLogger';
remoteLogger.log('Production error:', error);
```

---

## 📊 Performance Monitoring

### Performance Guidelines
- Follow performance constants in `lib/performanceConstants.js`
- Use FlatList for large datasets
- Implement lazy loading for images
- Monitor memory usage

### Analytics Setup (Optional)
```javascript
// Add analytics tracking
import { Analytics } from 'expo-analytics';

const analytics = new Analytics('your-tracking-id');
analytics.track('user_action', { action: 'button_click' });
```

---

## 🔄 Environment Management

### Development Environment
```env
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SUPABASE_URL=your_dev_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_supabase_key
```

### Staging Environment
```env
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_SUPABASE_URL=your_staging_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_staging_supabase_key
```

### Production Environment
```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=your_prod_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_prod_supabase_key
```

---

## 📚 Additional Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)

### Community
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://reactnative.dev/community/overview)
- [Supabase Discord](https://discord.supabase.com)

### Learning Resources
- [Expo Learning](https://docs.expo.dev/learn/)
- [React Native Learning](https://reactnative.dev/learn)
- [Supabase Learning](https://supabase.com/docs/guides)

---

## 🆘 Getting Help

### Common Commands
```bash
# Check Expo CLI version
expo --version

# Check project status
expo doctor

# Clear all caches
expo start --clear --reset-cache

# Update dependencies
npm update
```

### Support Channels
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: For community support
- **Documentation**: For technical questions

This setup guide provides everything needed to get started with R/HOOD app development. Follow the steps carefully and refer to the additional resources for deeper understanding.
