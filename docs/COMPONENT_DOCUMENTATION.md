# R/HOOD App - Component Documentation

## 📱 Overview

This document provides comprehensive documentation for all React Native components in the R/HOOD app. Each component is documented with its purpose, props, usage examples, and implementation details.

## 🏗️ Component Architecture

### Component Categories

```
components/
├── 🎵 Core Screens (Main app functionality)
├── 🔐 Authentication (Login/signup flows)
├── 🎨 UI Components (Reusable elements)
├── 🎧 Audio Components (Music-related)
├── 💬 Messaging (Chat functionality)
├── 👥 Social (Connections & community)
└── 🛠️ Utility (Helper components)
```

---

## 🎵 Core Screens

### ListenScreen.js
**Purpose**: Main music discovery and playback interface

**Key Features**:
- Audio mix browsing and playback
- Search functionality with genre filtering
- Queue management
- Background audio controls
- Progressive image loading for mix artwork

**Props**:
```javascript
{
  globalAudioState: Object,    // Current audio playback state
  onPlayAudio: Function,       // Audio play handler
  onPauseAudio: Function,      // Audio pause handler
  onResumeAudio: Function,     // Audio resume handler
  onStopAudio: Function,       // Audio stop handler
  onAddToQueue: Function,      // Add to queue handler
  onPlayNext: Function,        // Play next handler
  onClearQueue: Function,      // Clear queue handler
  onNavigate: Function,        // Navigation handler
  user: Object                 // Current user data
}
```

**Key Functions**:
- `fetchMixes()`: Loads mixes from database
- `handlePlayMix(mix)`: Initiates audio playback
- `handleSearch(query)`: Filters mixes by search query
- `loadMoreMixes()`: Pagination for mix loading

**Usage Example**:
```javascript
<ListenScreen
  globalAudioState={audioState}
  onPlayAudio={handlePlayAudio}
  onPauseAudio={handlePauseAudio}
  user={currentUser}
  onNavigate={navigateToScreen}
/>
```

### ConnectionsScreen.js
**Purpose**: User networking and connection management

**Key Features**:
- Connection discovery and management
- Message thread previews
- Connection status tracking
- Real-time updates

**Props**:
```javascript
{
  user: Object,              // Current user
  onNavigate: Function,      // Navigation handler
  initialTab: String         // Initial tab ('discover' | 'connections')
}
```

**Key Functions**:
- `loadConnections()`: Loads user connections
- `loadDiscoverableUsers()`: Loads potential connections
- `handleConnect(userId)`: Sends connection request
- `loadLastMessagesForConnections()`: Loads message previews

### MessagesScreen.js
**Purpose**: Real-time messaging interface

**Key Features**:
- Individual and group chat support
- Real-time message synchronization
- Multimedia message support
- Connection status validation

**Props**:
```javascript
{
  user: Object,              // Current user
  navigation: Object,        // Navigation object
  route: Object              // Route parameters
}
```

**Route Parameters**:
```javascript
{
  djId: String,              // For individual chats
  communityId: String,       // For group chats
  chatType: String           // 'individual' | 'group'
}
```

**Key Functions**:
- `loadMessages()`: Loads chat history
- `sendMessage()`: Sends new message
- `loadIndividualChat()`: Sets up individual chat
- `loadGroupChat()`: Sets up group chat

### CommunityScreen.js
**Purpose**: DJ community and group management

**Key Features**:
- Community browsing and joining
- Group chat access
- Member count display
- Community search

**Props**:
```javascript
{
  onNavigate: Function       // Navigation handler
}
```

### ProfileScreen.js
**Purpose**: User profile management and settings

**Key Features**:
- Profile editing
- Mix upload functionality
- Settings access
- Social media links

**Props**:
```javascript
{
  user: Object,              // Current user
  onNavigate: Function,      // Navigation handler
  onEditProfile: Function    // Profile edit handler
}
```

### SettingsScreen.js
**Purpose**: App configuration and preferences

**Key Features**:
- User preferences
- Notification settings
- Account management
- Help and support

---

## 🔐 Authentication Components

### LoginScreen.js
**Purpose**: User authentication interface

**Key Features**:
- Email/password login
- Social login integration
- Form validation
- Error handling

**Props**:
```javascript
{
  onLoginSuccess: Function,  // Login success callback
  onNavigateToSignup: Function // Navigate to signup
}
```

### SignupScreen.js
**Purpose**: User registration interface

**Key Features**:
- Account creation
- Form validation
- Terms acceptance
- Email verification

### OnboardingForm.js
**Purpose**: New user profile creation

**Key Features**:
- DJ profile setup
- Social media integration
- Genre selection
- Location setup

**Props**:
```javascript
{
  user: Object,              // New user data
  onComplete: Function       // Onboarding completion
}
```

---

## 🎨 UI Components

### ProgressiveImage.js
**Purpose**: Optimized image loading with progressive enhancement

**Features**:
- Placeholder while loading
- Smooth fade-in transition
- Error handling
- Caching support

**Props**:
```javascript
{
  source: Object,            // Image source {uri: string}
  style: Object,             // Image styles
  placeholderStyle: Object,  // Placeholder styles
  resizeMode: String         // Resize mode
}
```

**Usage Example**:
```javascript
<ProgressiveImage
  source={{ uri: user.profile_image_url }}
  style={styles.profileImage}
  placeholderStyle={styles.placeholder}
  resizeMode="cover"
/>
```

### AnimatedListItem.js
**Purpose**: List items with entrance animations

**Features**:
- Staggered animations
- Performance optimized
- Configurable animation timing

**Props**:
```javascript
{
  index: Number,             // Item index for animation delay
  children: ReactNode,       // Item content
  animationDelay: Number     // Custom animation delay
}
```

### RhoodModal.js
**Purpose**: Consistent modal component with brand styling

**Features**:
- Brand-compliant styling
- Backdrop handling
- Animation support
- Accessibility features

### Skeleton.js
**Purpose**: Loading state placeholders

**Features**:
- Shimmer animation
- Configurable shapes
- Brand colors

---

## 🎧 Audio Components

### DJMix.js
**Purpose**: Individual mix display and playback control

**Features**:
- Audio playback controls
- Waveform visualization
- Like/favorite functionality
- Share options

**Props**:
```javascript
{
  mix: Object,               // Mix data
  isPlaying: Boolean,        // Playback state
  onPlay: Function,          // Play handler
  onPause: Function,         // Pause handler
  onLike: Function           // Like handler
}
```

### UploadMixScreen.js
**Purpose**: Mix upload interface

**Features**:
- File selection and validation
- Artwork upload
- Metadata input
- Progress tracking

**Props**:
```javascript
{
  user: Object,              // Current user
  onBack: Function,          // Back navigation
  onUploadComplete: Function // Upload completion
}
```

**Key Functions**:
- `pickAudioFile()`: File selection
- `uploadMix()`: Upload process
- `validateFileSize()`: Size validation

---

## 💬 Messaging Components

### Message Components (within MessagesScreen.js)
**Purpose**: Individual message display

**Features**:
- Text and multimedia messages
- Timestamp formatting
- Sender information
- Message status indicators

### NotificationHandler.js
**Purpose**: Push notification management

**Features**:
- Notification routing
- Deep linking
- Badge management
- Background handling

---

## 👥 Social Components

### SwipeableOpportunityCard.js
**Purpose**: Opportunity browsing with swipe actions

**Features**:
- Swipe gestures
- Apply/reject actions
- Opportunity details
- Animation feedback

**Props**:
```javascript
{
  opportunity: Object,       // Opportunity data
  onApply: Function,         // Apply handler
  onReject: Function,        // Reject handler
  onViewDetails: Function    // Details handler
}
```

### UserProfileView.js
**Purpose**: Other user profile display

**Features**:
- Profile information
- Connection actions
- Message initiation
- Mix playback

---

## 🛠️ Utility Components

### LazyImage.js
**Purpose**: Lazy-loaded images for performance

**Features**:
- Intersection observer
- Memory optimization
- Error boundaries

### ScreenTransition.js
**Purpose**: Custom screen transition animations

**Features**:
- Brand animations
- Performance optimized
- Configurable timing

---

## 🎨 Styling System

### Shared Styles (lib/sharedStyles.js)
**Purpose**: Consistent styling across components

**Key Style Objects**:
```javascript
const sharedStyles = {
  // Colors
  colors: {
    primary: 'hsl(75, 100%, 60%)',
    background: 'hsl(0, 0%, 0%)',
    text: 'hsl(0, 0%, 100%)',
    card: 'hsl(0, 0%, 5%)',
    border: 'hsl(0, 0%, 15%)'
  },
  
  // Typography
  typography: {
    heading: {
      fontFamily: 'Arial Black',
      fontSize: 24,
      fontWeight: 'bold'
    },
    body: {
      fontFamily: 'Arial',
      fontSize: 16
    }
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  
  // Layout
  layout: {
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  }
};
```

### Component Styling Patterns
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sharedStyles.colors.background,
    padding: sharedStyles.spacing.md
  },
  
  card: {
    backgroundColor: sharedStyles.colors.card,
    borderRadius: sharedStyles.layout.borderRadius,
    padding: sharedStyles.spacing.md,
    marginBottom: sharedStyles.spacing.sm,
    ...sharedStyles.layout.shadow
  },
  
  primaryButton: {
    backgroundColor: sharedStyles.colors.primary,
    paddingVertical: sharedStyles.spacing.md,
    paddingHorizontal: sharedStyles.spacing.lg,
    borderRadius: sharedStyles.layout.borderRadius
  }
});
```

---

## 🔧 Component Development Guidelines

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfileView`)
- **Files**: PascalCase matching component name
- **Props**: camelCase (e.g., `onUserSelect`)
- **Styles**: camelCase (e.g., `containerStyle`)

### Component Structure
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ComponentName = ({ prop1, prop2, onAction }) => {
  // State declarations
  const [state, setState] = useState(initialValue);
  
  // Effect hooks
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // Event handlers
  const handleAction = () => {
    onAction(data);
  };
  
  // Render
  return (
    <View style={styles.container}>
      {/* Component JSX */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  }
});

export default ComponentName;
```

### Performance Best Practices
1. **Memoization**: Use `React.memo()` for expensive components
2. **Lazy Loading**: Implement for heavy components
3. **Image Optimization**: Use `ProgressiveImage` for all images
4. **List Optimization**: Use `FlatList` for large datasets
5. **Memory Management**: Clean up subscriptions and timers

### Testing Guidelines
```javascript
// Component testing example
import { render, fireEvent } from '@testing-library/react-native';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ComponentName prop1="value" onAction={jest.fn()} />
    );
    expect(getByText('Expected Text')).toBeTruthy();
  });
  
  it('handles user interaction', () => {
    const mockAction = jest.fn();
    const { getByTestId } = render(
      <ComponentName onAction={mockAction} />
    );
    
    fireEvent.press(getByTestId('action-button'));
    expect(mockAction).toHaveBeenCalledWith(expectedData);
  });
});
```

---

## 📚 Component Usage Examples

### Creating a New Screen Component
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { sharedStyles } from '../lib/sharedStyles';

const NewScreen = ({ user, onNavigate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      // Load data logic
      setData(result);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Screen</Text>
      {/* Screen content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sharedStyles.colors.background,
    padding: sharedStyles.spacing.md
  },
  title: {
    ...sharedStyles.typography.heading,
    color: sharedStyles.colors.text,
    marginBottom: sharedStyles.spacing.lg
  }
});

export default NewScreen;
```

### Creating a Reusable UI Component
```javascript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { sharedStyles } from '../lib/sharedStyles';

const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false,
  style 
}) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    style
  ];
  
  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: sharedStyles.spacing.md,
    paddingHorizontal: sharedStyles.spacing.lg,
    borderRadius: sharedStyles.layout.borderRadius,
    alignItems: 'center'
  },
  primary: {
    backgroundColor: sharedStyles.colors.primary
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: sharedStyles.colors.primary
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    fontSize: 16,
    fontWeight: '600'
  },
  primaryText: {
    color: sharedStyles.colors.background
  },
  secondaryText: {
    color: sharedStyles.colors.primary
  }
});

export default CustomButton;
```

This component documentation provides a comprehensive guide for understanding, maintaining, and extending the R/HOOD app's component architecture. Each component is designed with reusability, performance, and brand consistency in mind.
