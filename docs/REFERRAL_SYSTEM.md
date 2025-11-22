# DJ Invite & Referral System

## Overview

The R/HOOD app now includes a comprehensive invite and referral system that allows DJs to grow the community, earn credits, and track their referral performance.

## Features

### For DJs

- **Unique Invite Codes**: Every DJ automatically receives a unique 8-character invite code when their profile is created
- **Invite Code Display**: DJs can view and copy their invite code from their profile screen
- **Referral Tracking**: Track how many DJs you've referred and total credits earned

### Invites

- **Grow the Community**: Share your invite code with other DJs
- **Increase Ranking / Credits**: Earn 25 credits for each DJ you successfully refer
- **Track Referral Performance**: View your referral statistics on your profile

### Credits System

The referral system integrates with the existing credits system:

- **25 credits** for referring a DJ (awarded when the new DJ signs up with your invite code)
- **10 credits** for a like on a mix (already implemented)

## Database Schema

### New Tables

#### `referrals`
Tracks all referral relationships:
- `id`: UUID primary key
- `referrer_id`: UUID reference to the DJ who shared the invite code
- `referred_id`: UUID reference to the new DJ who signed up
- `invite_code`: The invite code that was used
- `credits_awarded`: Boolean flag to track if credits were awarded
- `created_at`: Timestamp of when the referral was created

### Modified Tables

#### `user_profiles`
- Added `invite_code` column: Unique 8-character alphanumeric code for each DJ

### Database Functions

1. **`generate_invite_code()`**: Generates a unique 8-character alphanumeric invite code
2. **`ensure_user_invite_code(user_uuid)`**: Ensures a user has an invite code, generating one if missing
3. **`process_referral(invite_code_param, new_user_id)`**: Processes a referral when a new user signs up, awards 25 credits to the referrer
4. **`get_referral_stats(user_uuid)`**: Returns referral statistics for a user

## Implementation Details

### Signup Flow

1. New users can optionally enter an invite code during signup
2. If an invite code is provided:
   - The system validates the invite code
   - Creates a referral record linking the new user to the referrer
   - Awards 25 credits to the referrer automatically
   - Prevents self-referrals and duplicate referrals

### Profile Creation

- Invite codes are automatically generated when a user profile is created
- Existing users without invite codes will have one generated automatically
- The invite code is displayed on the user's profile screen

### UI Components

#### ProfileScreen
- **Invite Code Card**: Displays the user's unique invite code with copy functionality
- **Referral Stats Card**: Shows total referrals and total credits earned from referrals

## API Functions

### `db.getUserInviteCode(userId)`
Gets or generates an invite code for a user.

### `db.processReferral(inviteCode, newUserId)`
Processes a referral when a new user signs up with an invite code. Awards 25 credits to the referrer.

### `db.getReferralStats(userId)`
Returns referral statistics:
```javascript
{
  totalReferrals: number,
  totalCreditsEarned: number
}
```

### `db.getReferredUsers(userId)`
Gets a list of users referred by a specific user.

## Setup Instructions

1. **Run the database migration**:
   ```sql
   -- Run the SQL file in Supabase SQL Editor
   database-migrations/add-invite-referral-system.sql
   ```

2. **The system will automatically**:
   - Generate invite codes for all existing users
   - Create the referrals table
   - Set up all necessary functions and indexes

## Usage

### For Users

1. **View Your Invite Code**:
   - Go to your Profile screen
   - Scroll to the "Invite & Earn" section
   - Tap on your invite code to copy it

2. **Share Your Invite Code**:
   - Copy your invite code
   - Share it with other DJs via any method (text, social media, etc.)

3. **Track Your Referrals**:
   - View your referral stats on your profile
   - See total referrals and credits earned

### For New Users

1. **During Signup**:
   - Enter a friend's invite code (optional)
   - Complete the signup process
   - Your friend will automatically receive 25 credits

## Security Features

- **Row Level Security (RLS)**: Enabled on the referrals table
- **Self-Referral Prevention**: Users cannot refer themselves
- **Duplicate Prevention**: Each user can only be referred once
- **Unique Invite Codes**: All invite codes are unique and validated

## Credit Awards

- **25 credits** for referring a DJ (awarded immediately when referral is processed)
- **10 credits** for a like on a mix (existing functionality)

## Future Enhancements

Potential future improvements:
- Referral leaderboards
- Bonus credits for milestone referrals (e.g., 10 referrals = 50 bonus credits)
- Referral analytics and insights
- Social sharing integration for invite codes
- Referral links with deep linking

