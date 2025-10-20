# R/HOOD App - Contributing Guide

## 🤝 Welcome Contributors!

Thank you for your interest in contributing to the R/HOOD app! This guide will help you understand our development process, coding standards, and how to contribute effectively.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Team Structure](#team-structure)

---

## 📜 Code of Conduct

### Our Commitment
We are committed to providing a welcoming and inclusive environment for all contributors. Please follow these guidelines:

- **Be respectful** and constructive in all interactions
- **Be patient** with newcomers and help them learn
- **Be collaborative** and open to different perspectives
- **Be professional** in all communications

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Spam or off-topic discussions
- Sharing private information without permission

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18.0.0+
- Git
- Expo CLI
- Basic knowledge of React Native

### Initial Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/rhood-app.git
   cd rhood-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables (see [Setup Guide](SETUP_GUIDE.md))
5. Start development server:
   ```bash
   npm start
   ```

---

## 🔄 Development Process

### Branch Strategy
We use a feature branch workflow:

```
main (production)
├── develop (integration)
├── feature/user-authentication
├── feature/messaging-system
├── bugfix/message-loading-issue
└── hotfix/critical-security-fix
```

### Branch Naming Convention
- **Features**: `feature/description-of-feature`
- **Bugfixes**: `bugfix/description-of-fix`
- **Hotfixes**: `hotfix/description-of-hotfix`
- **Documentation**: `docs/description-of-docs`

### Commit Message Format
Use conventional commits format:
```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(auth): add Apple Sign-In integration
fix(messages): resolve message loading issue
docs(api): update API documentation
style(components): fix linting issues
```

---

## 📝 Coding Standards

### JavaScript/React Native Standards

#### Component Structure
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

#### Naming Conventions
- **Components**: PascalCase (`UserProfileView`)
- **Functions**: camelCase (`handleUserSelect`)
- **Variables**: camelCase (`userData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Files**: PascalCase for components, camelCase for utilities

#### Code Style Rules
```javascript
// ✅ Good
const userProfile = await db.getUserProfile(userId);
const isConnected = connection.status === 'accepted';

// ❌ Bad
const user_profile = await db.getUserProfile(userId);
const is_connected = connection.status === 'accepted';

// ✅ Good - Destructuring
const { id, name, email } = user;

// ✅ Good - Conditional rendering
{isLoading ? <LoadingSpinner /> : <Content />}

// ✅ Good - Error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API call failed:', error);
  throw new Error('Failed to fetch data');
}
```

### Styling Standards

#### Use Shared Styles
```javascript
import { sharedStyles } from '../lib/sharedStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sharedStyles.colors.background,
    padding: sharedStyles.spacing.md
  },
  
  button: {
    backgroundColor: sharedStyles.colors.primary,
    paddingVertical: sharedStyles.spacing.md,
    borderRadius: sharedStyles.layout.borderRadius
  }
});
```

#### HSL Color System
```javascript
// ✅ Use HSL colors for consistency
const colors = {
  primary: 'hsl(75, 100%, 60%)',
  background: 'hsl(0, 0%, 0%)',
  text: 'hsl(0, 0%, 100%)',
  card: 'hsl(0, 0%, 5%)',
  border: 'hsl(0, 0%, 15%)'
};
```

### Performance Guidelines

#### Component Optimization
```javascript
// ✅ Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexUI data={data} />;
});

// ✅ Use useCallback for event handlers
const handlePress = useCallback(() => {
  onPress(data);
}, [data, onPress]);

// ✅ Use useMemo for expensive calculations
const processedData = useMemo(() => {
  return expensiveCalculation(rawData);
}, [rawData]);
```

#### List Optimization
```javascript
// ✅ Use FlatList for large datasets
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout} // If items have fixed height
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

---

## 🔍 Code Review Process

### Before Submitting a PR
1. **Self-review**: Check your code for issues
2. **Test thoroughly**: Ensure your changes work correctly
3. **Update documentation**: Update relevant docs if needed
4. **Run linter**: Fix any linting issues
5. **Write tests**: Add tests for new functionality

### PR Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements left in code
- [ ] Error handling implemented
- [ ] Performance considerations addressed

### Review Criteria
Reviewers will check for:
- **Functionality**: Does the code work as intended?
- **Style**: Does it follow our coding standards?
- **Performance**: Are there any performance issues?
- **Security**: Are there any security vulnerabilities?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code well-documented?

---

## 🐛 Issue Reporting

### Bug Reports
When reporting bugs, include:

1. **Environment**:
   ```
   - OS: iOS/Android version
   - Device: iPhone 14, Pixel 6, etc.
   - App version: 1.0.0
   - React Native version: 0.72.0
   ```

2. **Steps to Reproduce**:
   ```
   1. Open the app
   2. Navigate to Messages
   3. Try to send a message
   4. See error
   ```

3. **Expected vs Actual Behavior**:
   ```
   Expected: Message should send successfully
   Actual: App crashes with error
   ```

4. **Additional Context**:
   - Screenshots/videos
   - Console logs
   - Related issues

### Feature Requests
For feature requests, include:
- **Problem**: What problem does this solve?
- **Solution**: Describe your proposed solution
- **Alternatives**: Other solutions you've considered
- **Additional Context**: Screenshots, mockups, etc.

---

## 👥 Team Structure

### Roles and Responsibilities

#### Core Team
- **Project Lead**: Overall project direction and coordination
- **Tech Lead**: Technical architecture and code review
- **Design Lead**: UI/UX design and brand consistency
- **QA Lead**: Testing and quality assurance

#### Contributors
- **Frontend Developers**: React Native components and screens
- **Backend Developers**: Database and API development
- **Designers**: UI/UX design and brand assets
- **QA Engineers**: Testing and bug reporting
- **Documentation Writers**: Technical documentation

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **Pull Requests**: Code review and collaboration
- **Discord**: Real-time communication (if applicable)

### Meeting Schedule
- **Weekly Standup**: Mondays at 10 AM (if applicable)
- **Sprint Planning**: Bi-weekly on Fridays
- **Code Review**: As needed
- **Retrospectives**: End of each sprint

---

## 📚 Learning Resources

### For New Contributors
- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Our Architecture Overview](ARCHITECTURE_OVERVIEW.md)

### Recommended Reading
- [React Native Best Practices](https://reactnative.dev/learn)
- [Expo Best Practices](https://docs.expo.dev/guides/best-practices/)
- [Supabase Best Practices](https://supabase.com/docs/guides)

### Code Examples
Check our existing codebase for examples of:
- Component patterns
- API integration
- State management
- Error handling
- Testing patterns

---

## 🎯 Contribution Opportunities

### Good First Issues
Look for issues labeled with:
- `good first issue`: Suitable for newcomers
- `help wanted`: Community help needed
- `documentation`: Documentation improvements
- `bug`: Bug fixes

### Areas Needing Help
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: API docs, component docs, tutorials
- **Performance**: Optimization, monitoring, profiling
- **Accessibility**: Screen reader support, keyboard navigation
- **Internationalization**: Multi-language support

### Mentorship Program
We offer mentorship for new contributors:
- Pair programming sessions
- Code review guidance
- Architecture discussions
- Career development advice

---

## 📈 Recognition

### Contributor Recognition
We recognize contributors through:
- **GitHub Contributors**: Listed in project contributors
- **Release Notes**: Mentioned in release announcements
- **Community Highlights**: Featured in community updates
- **Swag**: R/HOOD merchandise for significant contributions

### Contribution Levels
- **Bronze**: 1-5 contributions
- **Silver**: 6-15 contributions
- **Gold**: 16-30 contributions
- **Platinum**: 31+ contributions

---

## 🔒 Security

### Security Reporting
For security vulnerabilities:
1. **DO NOT** create public issues
2. Email security concerns to: security@rhood.app
3. Include detailed description and steps to reproduce
4. We'll respond within 48 hours

### Security Best Practices
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Follow secure coding practices
- Report security issues responsibly

---

## 📞 Getting Help

### Support Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check existing docs first
- **Code Comments**: Ask questions in PR reviews

### Response Times
- **Critical Issues**: Within 24 hours
- **Bug Reports**: Within 48 hours
- **Feature Requests**: Within 1 week
- **General Questions**: Within 3 days

---

## 🎉 Thank You!

Thank you for contributing to the R/HOOD app! Your contributions help make the underground music community stronger and more connected.

Remember:
- Every contribution matters, no matter how small
- We're here to help you succeed
- Your ideas and feedback are valuable
- Together, we're building something amazing

Happy coding! 🎵
