# RhoodApp

A React Native mobile application built with Expo, featuring both frontend mobile app and backend API server.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the Expo development server:

```bash
npm start
```

3. Scan the QR code with Expo Go app (Android) or Camera app (iOS)

## 📱 Mobile App Features

- **Home Screen**: Welcome screen with quick actions and activity overview
- **Profile Screen**: User profile management with stats and settings
- **Settings Screen**: App preferences and configuration options
- **Bottom Tab Navigation**: Easy navigation between main screens
- **Modern UI**: Clean, responsive design with gradient backgrounds

## 🔧 Backend API

The project also includes a Node.js/Express backend API server.

### Running the Backend

```bash
# Start backend in development mode
npm run backend:dev

# Start backend in production mode
npm run backend:start
```

The backend API will be available at `http://localhost:3000`

## 📁 Project Structure

```
rhoodapp/
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── babel.config.js       # Babel configuration
├── assets/               # Images, fonts, and other static assets
├── components/           # Reusable React Native components
│   └── TabBarIcon.js
├── screens/              # App screens
│   ├── HomeScreen.js
│   ├── ProfileScreen.js
│   └── SettingsScreen.js
└── src/                  # Backend API source
    ├── controllers/
    ├── models/
    ├── routes/
    └── utils/
```

## 🛠 Available Scripts

### Mobile App

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

### Backend API

- `npm run backend:dev` - Start backend with nodemon (development)
- `npm run backend:start` - Start backend (production)

## 🎨 Customization

### Colors & Theme

The app uses a blue color scheme (`#2196F3`). You can customize colors in the individual screen files.

### Navigation

Navigation is handled by React Navigation v6 with bottom tabs. Modify `App.js` to add new screens or change navigation structure.

### Icons

Currently using Unicode emoji icons. For production apps, consider using:

- `@expo/vector-icons`
- `react-native-vector-icons`

## 📦 Dependencies

### Mobile App

- `expo` - Expo platform
- `react-native` - React Native framework
- `@react-navigation/native` - Navigation library
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `expo-linear-gradient` - Gradient backgrounds
- `expo-status-bar` - Status bar management

### Backend

- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables
- `nodemon` - Development server auto-reload

## 🚀 Deployment

### Mobile App

1. Build for production: `expo build`
2. Submit to app stores using Expo Application Services (EAS)

### Backend

Deploy to your preferred hosting platform (Heroku, AWS, DigitalOcean, etc.)

## 📄 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
