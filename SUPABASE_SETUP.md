# Supabase Database Setup for R/HOOD

This guide will help you connect your R/HOOD app to a Supabase database for cloud data storage.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `rhood-app`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
6. Click "Create new project"

### 2. Get Your Project Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Update Configuration

1. Open `lib/supabase.js` in your project
2. Replace the placeholder values:
   ```javascript
   const supabaseUrl = 'https://your-project.supabase.co';
   const supabaseAnonKey = 'your-anon-key-here';
   ```

### 4. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL commands
4. This will create all necessary tables and sample data

## 📊 Database Schema

### Tables Created:

- **user_profiles**: DJ profiles and information
- **opportunities**: Job postings and gigs
- **applications**: User applications to opportunities
- **notifications**: User notifications
- **communities**: DJ communities and groups
- **community_members**: Community membership
- **messages**: Direct messages between users

### Key Features:

- **Row Level Security (RLS)**: Data protection
- **Indexes**: Optimized for performance
- **Triggers**: Automatic timestamp updates
- **Sample Data**: Pre-populated for testing

## 🔧 Environment Variables (Optional)

For better security, you can use environment variables:

1. Create `.env` file in your project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Update `lib/supabase.js`:
   ```javascript
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
   ```

## 🎯 Integration Points

### User Profiles
- Replace AsyncStorage with Supabase for profile data
- Real-time profile updates
- Cloud backup of user data

### Opportunities
- Store opportunities in database
- Real-time updates when new opportunities are added
- Application tracking

### Notifications
- Push notifications from database
- Real-time notification updates
- Notification history

### Communities
- Community membership management
- Real-time member count updates
- Community messaging

## 🔒 Security Features

- **Row Level Security**: Users can only access their own data
- **JWT Authentication**: Secure user identification
- **Data Validation**: Database-level constraints
- **Audit Trails**: Automatic timestamp tracking

## 📱 Real-time Features

Supabase provides real-time subscriptions for:
- New opportunities
- Application status updates
- New notifications
- Community updates
- Direct messages

## 🧪 Testing

1. **Test Connection**: Check if app can connect to Supabase
2. **Test CRUD Operations**: Create, read, update, delete data
3. **Test Real-time**: Verify real-time updates work
4. **Test Security**: Ensure RLS policies work correctly

## 🚨 Troubleshooting

### Common Issues:

1. **Connection Failed**: Check URL and API key
2. **Permission Denied**: Verify RLS policies
3. **Schema Errors**: Ensure all tables are created
4. **Real-time Not Working**: Check subscription setup

### Debug Steps:

1. Check Supabase dashboard for errors
2. Use browser dev tools to inspect network requests
3. Check Supabase logs in the dashboard
4. Verify API key permissions

## 📈 Next Steps

1. **Authentication**: Add user login/signup
2. **File Upload**: Add profile image uploads
3. **Push Notifications**: Integrate with Expo notifications
4. **Analytics**: Add user behavior tracking
5. **Backup**: Set up automated database backups

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

---

**Your R/HOOD app is now ready for cloud data storage! 🎵**
