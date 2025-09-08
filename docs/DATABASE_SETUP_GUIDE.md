# R/HOOD Database Setup Guide

## 🚀 Quick Setup Steps

Your R/HOOD app is now configured with Supabase! Follow these steps to set up the database:

### 1. Access Your Supabase Dashboard

- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Sign in to your account
- Select your project: **jsmcduecuxtaqizhmiqo**

### 2. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql` from your project
4. Paste it into the SQL editor
5. Click **Run** to execute the schema

### 3. Verify Tables Created

After running the schema, you should see these tables in **Table Editor**:

- ✅ `user_profiles`
- ✅ `opportunities`
- ✅ `applications`
- ✅ `notifications`
- ✅ `communities`
- ✅ `community_members`
- ✅ `messages`

### 4. Test Your App

1. Start your app: `npx expo start`
2. Complete the onboarding process
3. Check the **Table Editor** in Supabase to see your profile data
4. Navigate to the **Opportunities** tab to see sample opportunities

## 🔧 What the Schema Includes

### Sample Data

- **3 Sample User Profiles**: DJ Pulse, Luna Beats, Darkside Collective
- **3 Sample Opportunities**: Warehouse Rave, Club Neon, Berlin Festival
- **3 Sample Communities**: Underground DJs, Techno Collective, Miami Music Scene

### Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Access Policies**: Users can only access their own data
- **JWT Authentication**: Ready for user authentication

### Database Features

- **Indexes**: Optimized for performance
- **Triggers**: Automatic timestamp updates
- **Foreign Keys**: Data integrity
- **Constraints**: Data validation

## 🎯 Next Steps

Once the database is set up:

1. **Test User Registration**: Create a profile in the app
2. **Test Opportunities**: View and apply to opportunities
3. **Test Real-time**: Check if data updates in real-time
4. **Customize Data**: Add your own opportunities and communities

## 🐛 Troubleshooting

### Common Issues:

- **Permission Denied**: Make sure RLS policies are created
- **Connection Failed**: Verify your API keys are correct
- **Tables Not Found**: Re-run the schema SQL

### Need Help?

- Check the Supabase logs in the dashboard
- Verify your project URL and API key
- Ensure all SQL commands executed successfully

---

**Your R/HOOD app is ready for cloud data storage! 🎵**

Once you complete these steps, your app will be fully connected to Supabase with real-time data capabilities.
