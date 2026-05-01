# Review Scope

## Target

React Native authentication module in `/Users/ming/Documents/GitHub/recipe-rn/src`

## Files

### Contexts (2 files)
- `contexts/AppAuthProvider.tsx` - Authentication provider component
- `contexts/AuthContext.tsx` - Authentication context definition

### Screens (2 files)
- `screens/auth/LoginScreen.tsx` - Login screen component
- `screens/auth/RegisterScreen.tsx` - Registration screen component

### Services (1 file)
- `services/database/auth-db.ts` - Authentication database operations

### Store (1 file)
- `store/authStore.ts` - Authentication state management (8.9K, largest file)

### Documentation
- `AGENTS.md` - Project agent configuration

**Total: 7 files (6 TypeScript/TSX files, 1 markdown)**

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: react-native (auto-detected)

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report

## Module Context

This appears to be a focused authentication module for a React Native recipe application. The module includes:
- React Context-based auth state management
- Zustand-style store (`authStore.ts`)
- Database service for auth operations
- Login and registration screens

**Note**: User requested to proceed through all phases without checkpoint stops.
