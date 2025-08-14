# Cookkit RN

A React Native recipe management app, Cookkit with comprehensive ESLint configuration for code quality.

## Features

- NativeWind v4
- Dark and light mode
  - Android Navigation Bar matches mode
  - Persistent mode
- Common components
  - ThemeToggle, Avatar, Button, Card, Progress, Text, Tooltip
- Comprehensive ESLint configuration
  - TypeScript support
  - React Native specific rules
  - React Hooks rules
  - Prettier integration

<img src="https://github.com/mrzachnugent/react-native-reusables/assets/63797719/42c94108-38a7-498b-9c70-18640420f1bc"
     alt="starter-base-template"
     style="width:270px;" />

## ESLint Configuration

This project uses ESLint v9 with flat config for comprehensive code quality checking. The configuration includes:

### Rules
- **TypeScript**: Strict type checking with TypeScript ESLint
- **React**: React and React Native specific rules
- **React Hooks**: Enforces rules of hooks and exhaustive dependencies
- **Code Quality**: Unused variables, console statements, and more

### Scripts
- `npm run lint` - Run ESLint on all files
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run lint:check` - Run ESLint with zero tolerance for warnings (CI/CD)
- `npm run lint:dev` - Run ESLint with relaxed warning limits (development)

### Configuration Files
- `eslint.config.js` - Main ESLint configuration (flat config format)
- Ignores test files, build artifacts, and platform-specific code
- Separate rules for TypeScript, JavaScript, and test files
