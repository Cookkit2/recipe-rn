# Authentication Module Test Suite

## Overview

This directory contains comprehensive test coverage for the authentication module following Test-Driven Development (TDD) principles. The test suite covers:

- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **Security Tests**: SQL injection, XSS, token tampering
- **Edge Cases**: Boundary conditions, null handling, error scenarios
- **Performance Tests**: Query performance, memory leaks

## Test Files

### 1. Store Tests (`src/store/__tests__/authStore.test.ts`)

Tests for the Zustand authentication store including:
- Initial state verification
- Login flow (success, failure, validation)
- Registration flow (success, failure, validation)
- Logout flow
- Token refresh logic
- Session checking
- Error handling
- Edge cases (concurrent requests, special characters, unicode)
- Security (account enumeration prevention)

**Coverage Areas:**
- ✅ State management
- ✅ Action creators
- ✅ Error handling
- ✅ Validation logic
- ✅ Async operations
- ✅ Loading states

### 2. Database Tests (`src/services/database/__tests__/auth-db.test.ts`)

Tests for the authentication database layer including:
- Database initialization
- User CRUD operations
- Session management
- Password hashing and verification
- Token operations
- Caching behavior
- Connection pooling
- Cleanup operations
- Edge cases (SQL injection, XSS, special characters)
- Performance (caching effectiveness)

**Coverage Areas:**
- ✅ Database schema
- ✅ CRUD operations
- ✅ Indexes and constraints
- ✅ Caching layer
- ✅ Security (parameterized queries)
- ✅ Performance (connection management)

### 3. Login Screen Tests (`src/screens/auth/__tests__/LoginScreen.test.tsx`)

Tests for the LoginScreen component including:
- Rendering and layout
- User input handling
- Form validation
- Login flow
- Loading states
- Error display
- Navigation
- Accessibility
- Edge cases (very long inputs, special characters, unicode)
- Security (generic error messages, account enumeration prevention)

**Coverage Areas:**
- ✅ Component rendering
- ✅ User interactions
- ✅ Form validation
- ✅ Error handling
- ✅ Accessibility
- ✅ Security (information leakage prevention)

### 4. Register Screen Tests (`src/screens/auth/__tests__/RegisterScreen.test.tsx`)

Tests for the RegisterScreen component including:
- Rendering and layout
- User input handling
- Form validation
- Registration flow
- Loading states
- Error display
- Navigation
- Accessibility
- Edge cases (very long inputs, special characters, unicode)
- Security (generic error messages, information leakage prevention)

**Coverage Areas:**
- ✅ Component rendering
- ✅ User interactions
- ✅ Form validation
- ✅ Error handling
- ✅ Accessibility
- ✅ Security (account enumeration prevention)

### 5. AuthContext Tests (`src/contexts/__tests__/AuthContext.test.tsx`)

Tests for the AuthContext provider and hook including:
- Context provider functionality
- Hook behavior
- State propagation
- Method delegation to store
- Error handling
- Type safety
- Performance (memoization)
- Edge cases (concurrent method calls, rapid login/logout)

**Coverage Areas:**
- ✅ Context provider
- ✅ Custom hook
- ✅ State management
- ✅ Type safety
- ✅ Performance (unnecessary re-renders)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Store tests
npm test -- --testPathPatterns=authStore

# Database tests
npm test -- --testPathPatterns=auth-db

# Login screen tests
npm test -- --testPathPatterns=LoginScreen

# Register screen tests
npm test -- --testPathPatterns=RegisterScreen

# Context tests
npm test -- --testPathPatterns=AuthContext
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

## Test Coverage Goals

- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Statements**: 80%+

## Test Structure

### Arrange-Act-Assert Pattern

All tests follow the AAA pattern:

```typescript
it('should login successfully with valid credentials', async () => {
  // Arrange
  const mockUser = { /* ... */ };
  mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
  mockAuthDb.verifyPassword.mockResolvedValue(true);

  // Act
  await act(async () => {
    await useAuthStore.getState().login('test@example.com', 'password123');
  });

  // Assert
  const state = useAuthStore.getState();
  expect(state.isAuthenticated).toBe(true);
  expect(state.user).toEqual(mockUser);
});
```

### Test Categories

#### 1. Happy Path Tests
Tests for expected successful scenarios:
- Valid credentials login
- Valid user registration
- Successful logout
- Token refresh

#### 2. Validation Tests
Tests for input validation:
- Invalid email format
- Short password
- Empty fields
- Invalid characters

#### 3. Error Handling Tests
Tests for error scenarios:
- Network failures
- Database errors
- Invalid credentials
- User already exists

#### 4. Security Tests
Tests for security vulnerabilities:
- SQL injection attempts
- XSS attempts
- Account enumeration
- Token tampering
- Information leakage

#### 5. Edge Case Tests
Tests for boundary conditions:
- Very long inputs
- Empty strings
- Null values
- Special characters
- Unicode characters
- Concurrent operations

#### 6. Performance Tests
Tests for performance characteristics:
- Caching effectiveness
- Memory leak detection
- Concurrent operation handling

## Mock Strategy

### External Dependencies

All external dependencies are mocked:

```typescript
jest.mock('~/src/services/database/auth-db');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-router');
```

### Mock Behavior

Mocks return realistic but deterministic values:

```typescript
mockAuthDb.getUserByEmail.mockResolvedValue({
  id: 'user-123',
  email: 'test@example.com',
  password_hash: 'hash',
  // ...
});
```

## CI/CD Integration

### Pre-commit Hook
```bash
# Run tests before commit
npm test && npm run lint
```

### GitHub Actions
```yaml
- name: Run tests
  run: npm test -- --coverage --ci
```

## Test Maintenance

### When to Update Tests

1. **New Features**: Add tests before implementing features (TDD)
2. **Bug Fixes**: Add regression tests
3. **Refactoring**: Update tests if API changes
4. **New Requirements**: Add tests for new validation rules

### Test Smells to Avoid

❌ **Testing Implementation Details**
```typescript
// DON'T
expect(component.state.count).toBe(5)
```

✅ **Testing User Behavior**
```typescript
// DO
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

❌ **Brittle Tests**
```typescript
// DON'T - depends on internal structure
expect(container.children[0].children[1]).toBeTruthy()
```

✅ **Resilient Tests**
```typescript
// DO - uses semantic queries
expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy()
```

## Test Data

### Valid Test Data
```typescript
const validCredentials = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
};
```

### Invalid Test Data
```typescript
const invalidCredentials = {
  email: 'invalid-email',
  password: '12345', // Too short
  displayName: '',
};
```

### Malicious Test Data
```typescript
const maliciousInputs = {
  sqlInjection: "'; DROP TABLE users; --",
  xss: '<script>alert("xss")</script>',
  pathTraversal: '../../../etc/passwd',
};
```

## Troubleshooting

### Common Issues

#### 1. Tests Fail Due to Mock Setup
**Solution**: Ensure all external dependencies are properly mocked

#### 2. Async Tests Timeout
**Solution**: Use `waitFor` or increase timeout
```typescript
await waitFor(() => {
  expect(element).toBeTruthy();
}, { timeout: 5000 });
```

#### 3. Tests Pass Individually But Fail in Suite
**Solution**: Ensure proper cleanup in `afterEach`
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## Best Practices

### 1. Test Isolation
Each test should be independent and not rely on other tests.

### 2. Descriptive Test Names
```typescript
// Good
it('should reject login with invalid email format', async () => {
  // ...
});

// Bad
it('should work', async () => {
  // ...
});
```

### 3. One Assertion Per Test
```typescript
// Good
it('should set isAuthenticated to true', async () => {
  // ...
  expect(state.isAuthenticated).toBe(true);
});

it('should set user object', async () => {
  // ...
  expect(state.user).toEqual(expectedUser);
});
```

### 4. Use Test Helpers
```typescript
import { mockUser, mockCredentials } from '~/utils/test-helpers';

it('should login successfully', async () => {
  // Use helpers for consistent test data
  await login(mockCredentials.validEmail, mockCredentials.validPassword);
});
```

## Coverage Reports

### Generate HTML Coverage Report
```bash
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html
```

### View Coverage in Terminal
```bash
npm test -- --coverage
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Contributing

When adding new features to the authentication module:

1. **Write tests first** (TDD approach)
2. Ensure all tests pass
3. Maintain 80%+ coverage
4. Update this documentation if needed
5. Run tests in CI before merging

## Test Checklist

Before marking a feature complete:

- [ ] All public functions have unit tests
- [ ] All API endpoints have integration tests
- [ ] Critical user flows have E2E tests
- [ ] Edge cases covered (null, empty, invalid)
- [ ] Error paths tested (not just happy path)
- [ ] Mocks used for external dependencies
- [ ] Tests are independent (no shared state)
- [ ] Test names describe what's being tested
- [ ] Assertions are specific and meaningful
- [ ] Coverage is 80%+ (verify with coverage report)
