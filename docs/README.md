# R/HOOD Documentation

Welcome to the R/HOOD underground music platform documentation. This folder contains all technical documentation, setup guides, and implementation details for the platform.

## 📚 Documentation Index

### 🏗️ **Core Documentation**
- **[Platform Documentation](./PLATFORM_DOCUMENTATION.md)** - Complete technical overview of the R/HOOD platform
- **[Architecture Diagram](./ARCHITECTURE_DIAGRAM.md)** - System architecture and data flow diagrams

### 🎨 **Design & Branding**
- **[Brand Guidelines](./brand-guidelines.md)** - Complete R/HOOD brand identity and design system
- **[Brand Compliance Summary](./brand-compliance-summary.md)** - Implementation status of brand guidelines
- **[Emoji & Glow Removal Summary](./emoji-glow-removal-summary.md)** - Clean, minimal design implementation

### 🚀 **Setup & Configuration**
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Complete guide to setting up Supabase database
- **[Database Setup Guide](./DATABASE_SETUP_GUIDE.md)** - Step-by-step database configuration
- **[Fix Database Error](./FIX_DATABASE_ERROR.md)** - Troubleshooting common database setup issues
- **[GitHub Setup](./GITHUB_SETUP.md)** - Version control and repository management

### ✨ **Feature Implementation**
- **[Splash Screen Implementation](./splash-screen-implementation.md)** - R/HOOD branded loading screen
- **[Enhanced Onboarding Form](./enhanced-onboarding-form.md)** - User profile creation with additional fields

## 🎯 **Quick Start**

1. **Read the [Platform Documentation](./PLATFORM_DOCUMENTATION.md)** for a complete technical overview
2. **Follow the [Supabase Setup](./SUPABASE_SETUP.md)** to configure your database
3. **Use the [Database Setup Guide](./DATABASE_SETUP_GUIDE.md)** for step-by-step instructions
4. **Reference [Brand Guidelines](./brand-guidelines.md)** for design consistency

## 🛠️ **Technology Stack**

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT)
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Version Control**: Git with GitHub

## 📱 **App Features**

- **User Profiles**: DJ profiles with social links and genre selection
- **Opportunities**: Job postings and gig opportunities
- **Applications**: Apply to opportunities with tracking
- **Communities**: DJ groups and networking
- **Messages**: Direct messaging between users
- **Notifications**: Real-time user notifications
- **Settings**: App configuration and preferences

## 🔧 **Development**

### Prerequisites
- Node.js and npm
- Expo CLI
- Supabase account
- Git and GitHub account

### Setup Commands
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Configure Supabase
# Follow docs/SUPABASE_SETUP.md
```

## 📊 **Database Schema**

The platform uses a PostgreSQL database with the following main tables:
- `user_profiles` - DJ profile information
- `opportunities` - Job postings and gigs
- `applications` - User applications to opportunities
- `notifications` - User notification system
- `communities` - DJ communities and groups
- `community_members` - Community membership tracking
- `messages` - Direct messaging between users

## 🎨 **Design System**

R/HOOD follows a dark, premium aesthetic with:
- **Primary Color**: HSL(75, 100%, 60%) - Lime/Yellow-Green
- **Background**: HSL(0, 0%, 0%) - Pure Black
- **Typography**: Arial Black for brand, Arial for body text
- **Minimal Icons**: Clean, text-based iconography
- **No Emojis**: Professional, underground aesthetic

## 🔒 **Security**

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure token-based authentication
- **HTTPS**: Encrypted data transmission
- **Input Validation**: Client and server-side validation

## 📈 **Performance**

- **Real-time Updates**: Live data synchronization
- **Offline Support**: AsyncStorage for offline access
- **Optimized Queries**: Database indexes for performance
- **Efficient Caching**: Smart data caching strategies

## 🐛 **Troubleshooting**

- **Database Issues**: See [Fix Database Error](./FIX_DATABASE_ERROR.md)
- **Setup Problems**: Check [Database Setup Guide](./DATABASE_SETUP_GUIDE.md)
- **Configuration**: Verify [Supabase Setup](./SUPABASE_SETUP.md)

## 📞 **Support**

For technical support or questions:
1. Check the relevant documentation in this folder
2. Review the troubleshooting guides
3. Check the GitHub repository issues
4. Contact the development team

---

**R/HOOD Documentation** - Last updated: December 2024

*This documentation provides comprehensive information about the R/HOOD underground music platform's architecture, features, and implementation.*
