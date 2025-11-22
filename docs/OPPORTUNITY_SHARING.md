# Opportunity Sharing with Referral Codes

## Overview

The R/HOOD app now supports sharing opportunities both inside the app (via DM) and outside the app (SMS, WhatsApp, IG DMs, etc.), with the sender's unique referral code automatically embedded in the shared message. This creates viral loops that help grow the community while rewarding DJs with credits.

## Features

### Dual Sharing Options

1. **In-App DM Sharing**
   - Share opportunities directly via direct messages to connections
   - Automatically includes referral code in the message
   - Seamless navigation to connections screen for recipient selection

2. **External App Sharing**
   - Share via SMS, WhatsApp, Instagram DMs, etc.
   - Uses native share sheet
   - Includes referral code and opportunity details

### Referral Code Embedding

- **Automatic Inclusion**: The sender's unique invite code is automatically included in all shared opportunity messages
- **User-Friendly Format**: Clear message with referral code prominently displayed
- **Viral Loop**: When recipients sign up using the referral code, the sender earns 25 credits

### App Download Link

- **Automatic Inclusion**: App download link is automatically included in all shared messages
- **Direct Download**: Recipients can download the app directly from the link
- **Viral Growth**: Makes it easy for recipients to join R/HOOD

## Implementation Details

### Share Message Format

When an opportunity is shared, the message includes:

```
🎧 [Opportunity Title]

[Opportunity Description]

📅 Date: [Date]
⏰ Time: [Time]
📍 Location: [Location]
💰 Compensation: [Compensation]
📏 Distance: [Distance]

🎁 Use my invite code when you sign up: [REFERRAL_CODE]

You'll help me earn credits and I'll help you get started! 🎵

📱 Download R/HOOD app: https://rhood.io/download

Check it out on R/HOOD! 🎵
```

### Components

#### `lib/shareOpportunity.js`
Utility functions for generating share messages:
- `generateOpportunityShareMessage()`: Main function to generate share messages with referral codes
- `generateExternalShareMessage()`: For external app sharing
- `generateDMShareMessage()`: For in-app DM sharing

#### `components/RhoodModal.js`
Updated modal with enhanced sharing:
- **Dual Share Options**: Shows action sheet with "Share via DM" and "Share Outside App" options
- **iOS/Android Support**: Uses ActionSheetIOS on iOS, Alert on Android
- **Automatic Referral Code**: Fetches and includes user's invite code automatically

#### `App.js`
Share handlers:
- `handleShareOpportunityInApp()`: Navigates to connections screen in share mode
- `sendOpportunityShareMessage()`: Sends the opportunity share message to selected recipient

#### `components/ConnectionsScreen.js`
Enhanced with share mode:
- Detects when in share mode via route params
- Allows selecting a connection to share to
- Calls the share handler when connection is selected

## User Flow

### In-App DM Sharing

1. User views an opportunity and taps "Share" button
2. Modal shows action sheet with two options:
   - "Share via DM"
   - "Share Outside App"
3. User selects "Share via DM"
4. App navigates to Connections screen in share mode
5. User selects a connection to share with
6. Message is automatically sent with:
   - Full opportunity details
   - Sender's referral code
7. User is navigated to the message thread to see the sent message

### External App Sharing

1. User views an opportunity and taps "Share" button
2. Modal shows action sheet with two options:
   - "Share via DM"
   - "Share Outside App"
3. User selects "Share Outside App"
4. Native share sheet appears with:
   - Pre-formatted message including opportunity details and referral code
   - Options to share via SMS, WhatsApp, Instagram, etc.
5. User selects app and shares

### Recipient Flow (New User)

1. Recipient receives shared opportunity message with referral code
2. Recipient downloads R/HOOD app
3. During signup, recipient enters the referral code (optional)
4. System automatically:
   - Links the referral relationship
   - Awards 25 credits to the referrer
   - Creates referral tracking record

## Technical Details

### Share Mode Implementation

When sharing in-app, the connections screen is initialized with:
```javascript
{
  shareMode: true,
  shareMessage: "[formatted message with referral code]",
  shareOpportunity: { /* opportunity object */ },
  onShareSelect: async (selectedUserId) => {
    // Handler to send message
  }
}
```

### Message Sending

When a connection is selected in share mode:
1. Get or create message thread between sender and recipient
2. Insert message with opportunity details and referral code
3. Navigate user to message thread
4. Show success confirmation

### Referral Code Integration

- Referral codes are fetched automatically when sharing
- If user doesn't have a code, one is generated on-the-fly
- Codes are formatted for easy entry (uppercase, alphanumeric)
- Clear instructions included in share message

## Benefits

### For DJs

- **Earn Credits**: 25 credits for each successful referral
- **Grow Network**: Share opportunities with connections
- **Community Building**: Help other DJs discover opportunities

### For the Platform

- **Viral Growth**: Automatic referral loops built into sharing
- **User Acquisition**: Incentivized sharing through credits
- **Community Expansion**: DJs help bring in new members

### For Recipients

- **Discover Opportunities**: Learn about gigs through trusted connections
- **Easy Signup**: Clear instructions with referral code
- **Support Friends**: Help referrers earn credits while joining

## Future Enhancements

Potential improvements:
- Deep linking to specific opportunities when shared
- Tracking which opportunities get shared most
- Analytics on referral conversion rates
- Batch sharing to multiple connections
- Custom message editing before sharing
- Share to group chats/communities
- Social media preview cards with opportunity images

