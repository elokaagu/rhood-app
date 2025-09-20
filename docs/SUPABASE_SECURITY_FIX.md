# 🔒 Fix Supabase Security Issues

Your Supabase database has security vulnerabilities that need to be fixed. The main issue is that **Row Level Security (RLS)** is not properly enabled on your public tables.

## 🚨 Current Issues

Based on the Security Advisor, you have:

- **9 errors** - RLS disabled on public tables
- **6 warnings** - Additional security concerns
- **0 suggestions** - No info-level issues

## 🛠️ Quick Fix (Recommended)

### Step 1: Access Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your R/HOOD project

### Step 2: Run the Security Fix

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `database/quick-security-fix.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the fix

### Step 3: Verify the Fix

1. Go to **Security Advisor** in your Supabase dashboard
2. Click **Refresh** to update the security status
3. You should now see **0 errors** and **0 warnings**

## 🔧 What the Fix Does

### Enables Row Level Security (RLS)

- Enables RLS on all public tables
- Prevents unauthorized access to your data
- Ensures users can only access their own data

### Creates Security Policies

- **User Profiles**: Anyone can view, users can only edit their own
- **Opportunities**: Anyone can view, authenticated users can create
- **Applications**: Users can only see their own applications
- **Notifications**: Users can only see their own notifications
- **Communities**: Anyone can view, authenticated users can create
- **Messages**: Users can only see messages they sent/received

### Grants Proper Permissions

- Authenticated users get full access to their data
- Anonymous users get read-only access to public data
- Prevents unauthorized data modification

## 🚀 Advanced Fix (If Needed)

If you still have issues after the quick fix, run the comprehensive fix:

1. Copy the contents of `database/fix-security-issues.sql`
2. Run it in the SQL Editor
3. This includes additional security measures and helper functions

## ✅ Expected Results

After running the fix, you should see:

- ✅ **0 errors** in Security Advisor
- ✅ **0 warnings** in Security Advisor
- ✅ All tables protected with RLS
- ✅ Proper user permissions configured

## 🔍 Verification Steps

1. **Check Security Advisor**: Should show 0 errors/warnings
2. **Test Data Access**: Try accessing data from your app
3. **Verify Permissions**: Ensure users can only access their own data
4. **Check Table Security**: All tables should show RLS enabled

## 🆘 Troubleshooting

### If you get permission errors:

- Make sure you're running the SQL as the database owner
- Check that you have the correct project selected

### If RLS policies don't work:

- Verify that authentication is properly set up
- Check that `auth.uid()` returns the correct user ID
- Ensure policies are created without conflicts

### If you still see security warnings:

- Run the comprehensive fix script
- Check for any additional tables that might need RLS
- Verify that all policies are properly created

## 📞 Need Help?

If you encounter any issues:

1. Check the Supabase logs in the dashboard
2. Verify your authentication setup
3. Test with a simple query first
4. Contact Supabase support if needed

---

**Important**: Always backup your database before running security fixes, especially in production environments.
