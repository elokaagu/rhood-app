# 🍎 Apple OAuth Setup Guide for R/HOOD

## Overview

This guide will help you set up full Apple OAuth for web-based Sign in with Apple. This is needed when native Apple Sign-In isn't available (like in older builds or Expo Go).

---

## 📋 What You Need

From Apple Developer Console:

1. **Team ID** (10 characters)
2. **Services ID** (Client ID)
3. **Key ID** (10 characters)
4. **Private Key** (.p8 file)

---

## 🔧 Step-by-Step Setup

### Step 1: Get Your Team ID

1. Go to: https://developer.apple.com/account
2. Look at the **top right corner** of the page
3. You'll see your **Team ID** (10 characters, like: `ABC1234DEF`)
4. **Copy and save it** - you'll need this for Supabase

---

### Step 2: Create a Services ID

1. Go to: https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Click the **"+"** button (top left) to add a new identifier
3. Select **"Services IDs"** → Click **"Continue"**
4. Fill in the form:
   - **Description**: `R/HOOD Sign In`
   - **Identifier**: `com.rhoodapp.mobile.signin`
5. Click **"Continue"** → Click **"Register"**

> **Note:** The Services ID (`com.rhoodapp.mobile.signin`) is different from your app's bundle ID (`com.rhoodapp.mobile`). This is intentional!

---

### Step 3: Configure the Services ID for Sign in with Apple

1. In the Services IDs list, **click on** the Services ID you just created
2. Check the box for **"Sign in with Apple"** to enable it
3. Click **"Configure"** next to "Sign in with Apple"
4. In the configuration screen:
   - **Primary App ID**: Select `com.rhoodapp.mobile` (your app's bundle ID)
   - **Website URLs** section:
     - **Domains**: `jsmcduecuxtaqizhmiqo.supabase.co`
     - **Return URLs**: `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`
5. Click **"Save"**
6. Click **"Continue"** → Click **"Save"** again

---

### Step 4: Create a Sign in with Apple Key

1. Go to: https://developer.apple.com/account/resources/authkeys/list
2. Click the **"+"** button to create a new key
3. Fill in:
   - **Key Name**: `R/HOOD Sign in with Apple Key`
   - Check the box for **"Sign in with Apple"**
4. Click **"Configure"** next to "Sign in with Apple"
5. Select **Primary App ID**: `com.rhoodapp.mobile`
6. Click **"Save"**
7. Click **"Continue"**
8. Click **"Register"**
9. **Download the .p8 file** - you can only download this ONCE!
10. **Save the Key ID** (10 characters, like: `AB12CD34EF`)

> ⚠️ **IMPORTANT:** You can only download the .p8 file once! Save it somewhere safe.

---

### Step 5: Convert .p8 Key to JWT Secret

The .p8 file needs to be converted to a JWT (JSON Web Token) format for Supabase.

#### Option A: Use Node.js Script (Recommended)

I'll create a script for you to convert the .p8 file:

1. Save your downloaded .p8 file to the project root (e.g., `AuthKey_AB12CD34EF.p8`)
2. Run the conversion script (I'll create this for you)
3. Copy the JWT output

#### Option B: Manual Conversion

If you prefer, you can use online tools or manual methods, but the script is safer.

---

### Step 6: Add Credentials to Supabase

1. Go to: https://supabase.com/dashboard/project/jsmcduecuxtaqizhmiqo/auth/providers
2. Click on **"Apple"**
3. Fill in the fields:
   - **Enable Sign in with Apple**: Toggle ON ✅
   - **Client IDs**: `com.rhoodapp.mobile.signin` (your Services ID)
   - **Team ID**: (Your 10-character Team ID from Step 1)
   - **Key ID**: (Your 10-character Key ID from Step 4)
   - **Secret Key**: (The JWT you generated in Step 5)
   - **Allow users without an email**: Toggle ON ✅ (recommended)
4. Click **"Save"**

---

## ✅ Testing

After setup:

1. Open your R/HOOD app in TestFlight
2. Tap **"Continue with Apple"**
3. Should open Safari browser with Apple Sign-In
4. Complete sign-in
5. Should redirect back to app successfully ✅

---

## 🐛 Troubleshooting

### Error: "Unable to exchange external code"

**Cause:** Client IDs don't match or credentials are incorrect  
**Fix:** Double-check all credentials in Supabase match Apple Developer Console

### Error: "Sign in not completed"

**Cause:** Redirect URL not configured correctly  
**Fix:** Verify the return URL in Services ID configuration matches Supabase callback URL exactly

### Error: "Invalid client"

**Cause:** Services ID not properly configured  
**Fix:** Make sure you enabled "Sign in with Apple" on the Services ID and configured it with your app's bundle ID

---

## 📚 Summary

**What you configured:**

- ✅ Team ID from Apple Developer account
- ✅ Services ID (`com.rhoodapp.mobile.signin`) for web OAuth
- ✅ Sign in with Apple Key (.p8 file)
- ✅ JWT secret for Supabase
- ✅ Supabase Apple provider with all credentials

**What this enables:**

- ✅ Web-based Apple Sign-In (browser fallback)
- ✅ Works in current TestFlight builds
- ✅ Works alongside native Apple Sign-In (when available)

**Next steps:**

- Build v1.1.0 with native modules for better UX
- Native Apple Sign-In won't need browser popup
- Will show "R/HOOD" branding instead of Supabase domain

---

## 🔐 Security Notes

- **Never commit** the .p8 file to GitHub
- **Never commit** the JWT secret to GitHub
- Store these securely (password manager, encrypted storage)
- The .p8 file can only be downloaded once from Apple
- Keys can be revoked and regenerated if compromised

---

## 📞 Need Help?

If you run into issues:

1. Check Apple Developer Console for any warnings
2. Verify all IDs match exactly (no typos)
3. Check Supabase logs for detailed error messages
4. Ensure return URL is exactly: `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`

---

**Ready to start?** Follow the steps above and let me know when you reach Step 5 (converting the .p8 file) - I'll create a script to help with that! 🚀
