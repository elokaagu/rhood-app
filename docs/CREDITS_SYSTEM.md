# 💰 R/HOOD Credits System Documentation

Complete guide to credit awards and deductions in the R/HOOD app.

## 📋 Overview

Credits are the internal currency of R/HOOD that reward active participation and can be used for premium features. Credits are **private** - only you can see your own credit balance on your profile page.

---

## ➕ Credit Awards (Earning Credits)

### Social Interactions

| Action | Credits | Description | Location |
|--------|---------|-------------|----------|
| **Mix Liked** | **+10** | Someone likes your uploaded mix | `components/ListenScreen.js:729` |
| **Mix Unliked** | **-10** | Someone unlikes your mix (deducted from mix owner) | `components/ListenScreen.js:789` |

### Referral System

| Action | Credits | Description | Location |
|--------|---------|-------------|----------|
| **Referral Signup** | **+25** | Someone signs up using your invite code | `database-migrations/add-invite-referral-system.sql:101` |

**How it works:**
- Each DJ has a unique invite code
- When a new user signs up with your invite code, you receive 25 credits
- Credits are awarded automatically when the referral is processed
- Each user can only be referred once

### Gig Completion

| Action | Credits | Description | Location |
|--------|---------|-------------|----------|
| **Complete Gig** | **+10** | Successfully complete a gig/opportunity | `archive/database-migrations/migration-add-credits-system.sql:30` |

**Note:** This is implemented in the database migration but may need to be triggered when a gig is marked as completed.

### Achievements

Achievements award credits based on their category and type:

| Achievement | Credits | Requirement | Category | Location |
|---------------|---------|-----------|----------|----------|
| **First Gig** | **+10** | Complete 1 gig | `gig` | `lib/kb.json:2743` |
| **First Mix** | **+10** | Upload 1 mix | `milestone` | `lib/kb.json:2743` |
| **5-Star Rating** | **+50** | Achieve 4.8+ rating | `ratings` | `lib/kb.json:2743` |
| **10 Gigs** | **+100** | Complete 10 gigs | `milestone` | `lib/kb.json:2743` |
| **Verified Artist** | **+100** | Get verified | `special` | `lib/kb.json:2743` |
| **Community Builder** | **+150** | Connect with 50+ DJs | `social` | `lib/kb.json:2743` |
| **Top Performer** | **+200** | 4.9+ rating with 20+ gigs | `special` | `lib/kb.json:2743` |
| **50 Gigs** | **+500** | Complete 50 gigs | `milestone` | `lib/kb.json:2743` |

**Achievement Credit Defaults by Category:**
- `milestone`: 25 credits (default)
- `social`: 15 credits (default)
- `gig`: 20 credits (default)
- `special`: 50 credits (default)
- Other: 10 credits (default)

---

## ➖ Credit Deductions (Spending Credits)

### Application Boosting

| Action | Credits | Description | Location |
|--------|---------|-------------|----------|
| **Boost Application** | **-10** | Boost your application to the top of the list for 24 hours | `App.js:2895`, `database-migrations/add-application-boost.sql:21` |

**How it works:**
- Boost places your application at the top of the organizer's review list
- Boost duration: 24 hours (default)
- Cost: 10 credits
- Requires sufficient credits balance
- Cannot boost if already boosted and not expired

**Boost Function Parameters:**
```javascript
boostApplication(applicationId, boostDurationHours = 24, creditsCost = 10)
```

---

## 🔧 Technical Implementation

### Credit Management Functions

**Increment Credits:**
```javascript
// lib/supabase.js:711
await db.incrementUserCredits(userId, amount)
```
- Adds or subtracts credits (use negative amount to deduct)
- Validates user ID and amount
- Updates `user_profiles.credits` column

**Get User Credits:**
```javascript
// lib/supabase.js:651
await db.getUserCredits(userId)
```
- Returns user's current credit balance
- Only accessible by the user themselves (privacy)

### Database Functions

**Process Referral:**
```sql
-- database-migrations/add-invite-referral-system.sql:93
process_referral(invite_code_param, new_user_id)
```
- Awards 25 credits to referrer
- Creates referral record
- Prevents self-referral and duplicate referrals

**Boost Application:**
```sql
-- database-migrations/add-application-boost.sql:18
boost_application(application_id_param, boost_duration_hours, credits_cost)
```
- Deducts credits from user
- Sets boost status and expiration
- Validates sufficient credits

**Award Gig Credits:**
```sql
-- archive/database-migrations/migration-add-credits-system.sql:26
award_gig_credits(gig_id)
```
- Awards 10 credits for gig completion
- Prevents duplicate awards

**Award Achievement Credits:**
```sql
-- archive/database-migrations/migration-add-credits-system.sql:61
award_achievement_credits(user_id, achievement_id)
```
- Awards credits based on achievement's `credits_value`
- Prevents duplicate awards

### Credit Balance Validation

All credit deduction operations check for sufficient balance:
- **Boost Application**: Validates credits >= cost before processing
- **Error Message**: "Insufficient credits. You need X credits to boost this application."

---

## 📊 Credit Summary Table

### Quick Reference

| Category | Action | Credits | Type |
|----------|--------|---------|------|
| **Social** | Mix Liked | +10 | Award |
| **Social** | Mix Unliked | -10 | Deduction |
| **Referral** | Referral Signup | +25 | Award |
| **Gig** | Complete Gig | +10 | Award |
| **Achievement** | First Gig | +10 | Award |
| **Achievement** | First Mix | +10 | Award |
| **Achievement** | 5-Star Rating | +50 | Award |
| **Achievement** | 10 Gigs | +100 | Award |
| **Achievement** | Verified Artist | +100 | Award |
| **Achievement** | Community Builder | +150 | Award |
| **Achievement** | Top Performer | +200 | Award |
| **Achievement** | 50 Gigs | +500 | Award |
| **Premium** | Boost Application | -10 | Deduction |

---

## 🔒 Privacy & Security

- **Credits are private**: Only you can see your own credit balance
- **No public display**: Other users cannot see your credits
- **Secure transactions**: All credit operations are validated server-side
- **Prevent duplicates**: Systems prevent awarding credits multiple times for the same action

---

## 📝 Notes

1. **Credit Balance**: Starts at 0 for new users
2. **Negative Credits**: The system prevents negative credit balances (validates before deduction)
3. **One-Time Awards**: Most credit awards are one-time only (referrals, achievements, gig completion)
4. **Recurring Awards**: Mix likes can be awarded multiple times (each like = +10 credits)
5. **Boost Cost**: Currently set to 10 credits, but can be configured in the `boost_application` function

---

## 🔄 Future Considerations

Potential credit operations that could be added:
- Premium features (e.g., featured profile, priority support)
- Marketplace transactions
- Event promotion
- Advanced search filters
- Analytics access

---

## 📚 Related Documentation

- `database-migrations/add-invite-referral-system.sql` - Referral system implementation
- `database-migrations/add-application-boost.sql` - Boost functionality
- `archive/database-migrations/migration-add-credits-system.sql` - Original credits system
- `lib/supabase.js` - Credit management functions
- `docs/GIGS_AND_ACHIEVEMENTS.md` - Achievement system details

---

**Last Updated**: Based on codebase as of current implementation
**Version**: 1.0

