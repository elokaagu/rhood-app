# R/HOOD - Underground Music Platform

![R/HOOD Logo](https://img.shields.io/badge/R%2FHOOD-Underground%20Music%20Platform-lime?style=for-the-badge&logo=music&logoColor=white)

A React Native mobile application for the underground music community, featuring DJ networking, event discovery, and music platform integration.

## 🎵 Features

### ✨ Core Functionality
- **Splash Screen**: Animated R/HOOD branding with loading progress
- **User Onboarding**: Comprehensive DJ profile creation
- **Social Integration**: Instagram and SoundCloud profile linking
- **Location Services**: City-based networking and discovery
- **Genre Selection**: Multi-select music genre preferences
- **Dark Theme**: Underground aesthetic with lime accents

### 🎨 Design System
- **Brand Guidelines**: Complete R/HOOD visual identity
- **Dark Theme**: Pure black backgrounds with high contrast
- **Signature Colors**: Lime/yellow-green primary color
- **Typography**: Arial/Arial Black font family
- **Professional UI**: Clean, modern interface design

### 📱 Mobile Features
- **Cross-Platform**: React Native for iOS and Android
- **Touch Optimized**: Mobile-first responsive design
- **Smooth Animations**: Native performance animations
- **Offline Ready**: Local data persistence with AsyncStorage

## 🚀 Getting Started

### Quick Start
1. **Clone and install**
   ```bash
   git clone https://github.com/elokaagu/rhood-app.git
   cd rhood-app
   npm install
   ```

2. **Set up environment**
   - Follow our [Setup Guide](docs/SETUP_GUIDE.md) for detailed instructions
   - Configure Supabase and environment variables

3. **Start development**
   ```bash
   npm start
   ```

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn
- Expo CLI
- Supabase account
- iOS Simulator or Android Emulator

For detailed setup instructions, see our [Setup Guide](docs/SETUP_GUIDE.md).

## 📁 Project Structure

```
rhoodapp/
├── components/           # React Native components
├── lib/                  # Utility libraries and services
├── database/            # Database schema and migrations
├── docs/                # Comprehensive documentation
├── assets/              # Images, fonts, and media
├── scripts/             # Build and deployment scripts
├── App.js              # Main application component
└── README.md           # This file
```

## 📚 Documentation

We provide comprehensive documentation to help you understand and contribute to the R/HOOD app:

### 📖 [Documentation Hub](docs/README.md)
Complete documentation index with guides for all aspects of the app.

### 🏗️ [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)
System architecture, technology stack, and design decisions.

### 💻 [Component Documentation](docs/COMPONENT_DOCUMENTATION.md)
Detailed documentation for all React Native components.

### 🗄️ [Database Schema](docs/DATABASE_SCHEMA.md)
Complete database design and API reference.

### 🚀 [Setup Guide](docs/SETUP_GUIDE.md)
Step-by-step development environment setup.

### 🤝 [Contributing Guide](docs/CONTRIBUTING_GUIDE.md)
Guidelines for contributing to the project.

## 🎨 Brand Guidelines

The app follows the R/HOOD brand guidelines:

- **Primary Color**: `hsl(75, 100%, 60%)` (Lime/Yellow-Green)
- **Background**: `hsl(0, 0%, 0%)` (Pure Black)
- **Text**: `hsl(0, 0%, 100%)` (Pure White)
- **Typography**: Arial/Arial Black
- **Aesthetic**: Underground, premium, music-focused

See `brand-guidelines.md` for complete design system documentation.

## 🔧 Technical Stack

- **Framework**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: AsyncStorage + Supabase Storage
- **Styling**: StyleSheet with HSL color system
- **Authentication**: JWT with Row Level Security

## 📱 Screenshots

### Splash Screen
- Animated R/HOOD logo with loading progress
- Underground music platform branding
- Smooth fade and scale animations

### Onboarding Form
- Comprehensive DJ profile creation
- Social media integration (Instagram, SoundCloud)
- City selection dropdown
- Music genre multi-selection
- Professional dark theme design

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](docs/CONTRIBUTING_GUIDE.md) for detailed information on:

- Code of conduct and guidelines
- Development workflow and standards
- Pull request process
- Issue reporting
- Team collaboration

### Quick Start for Contributors
1. Fork the repository
2. Read the [Setup Guide](docs/SETUP_GUIDE.md)
3. Check the [Contributing Guide](docs/CONTRIBUTING_GUIDE.md)
4. Create a feature branch
5. Make your changes
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎵 About R/HOOD

R/HOOD is an underground music platform designed to connect DJs, producers, and music enthusiasts. The app provides a professional networking environment for the underground music community with features tailored to the music industry.

## 📞 Support & Contact

- **Project**: R/HOOD Underground Music Platform
- **GitHub**: [@elokaagu](https://github.com/elokaagu)
- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/elokaagu/rhood-app/issues)

### Getting Help
- 📚 Check our [Documentation Hub](docs/README.md)
- 🐛 Report bugs via [GitHub Issues](https://github.com/elokaagu/rhood-app/issues)
- 💬 Ask questions in [GitHub Discussions](https://github.com/elokaagu/rhood-app/discussions)

---

**Built with ❤️ for the underground music community**