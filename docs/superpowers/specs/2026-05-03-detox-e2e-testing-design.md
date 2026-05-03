# Detox E2E Testing Design

**Date:** 2026-05-03
**Project:** recipe-rn (Cookkit)
**Author:** Claude
**Status:** Approved

## Overview

Implement comprehensive end-to-end testing for the Cookkit recipe app using Detox with Page Object Model pattern. This design provides a maintainable, scalable approach to E2E testing that covers all critical user flows.

## Goals

- **Maintainability:** Clear separation between test logic and screen selectors
- **Coverage:** Test all critical user flows (auth, recipes, meal planning, grocery lists, onboarding)
- **Reliability:** Use dedicated test backend for consistent results
- **Simplicity:** Local-only execution for now (CI can be added later)
- **Correctness:** Prioritize test reliability over execution speed

## Architecture

### Page Object Model Pattern

The design uses Page Object Model (POM) to separate test logic from screen-specific selectors:

- **Screen Objects:** Contain selectors and basic actions for each screen
- **Test Scenarios:** Contain test logic and assertions
- **Helpers:** Contain reusable utilities and custom matchers

This approach ensures that UI changes only require updating screen objects, not test logic.

## Directory Structure

```
e2e/
├── detox.config.js          # Detox configuration
├── init.js                  # Custom Detox init (test globals, helpers)
├── helpers/
│   ├── matchers.ts          # Custom Detox matchers (e.g., byTestId)
│   └── actions.ts           # Reusable test actions (scroll, wait, etc.)
├── screens/                 # Page Objects for each screen
│   ├── BaseScreen.ts        # Base class with common screen methods
│   ├── AuthScreen.ts        # Sign in, sign up, forgot password
│   ├── HomeScreen.ts        # Main app screen
│   ├── RecipeDetailsScreen.ts
│   ├── RecipeListScreen.ts
│   ├── MealPlanScreen.ts
│   ├── GroceryListScreen.ts
│   ├── OnboardingScreen.ts
│   └── ProfileScreen.ts
├── scenarios/               # Test files organized by flow
│   ├── auth/
│   │   ├── sign-in.e2e.ts
│   │   ├── sign-up.e2e.ts
│   │   └── password-reset.e2e.ts
│   ├── recipes/
│   │   ├── browse-recipes.e2e.ts
│   │   ├── view-recipe-details.e2e.ts
│   │   ├── search-recipes.e2e.ts
│   │   └── edit-recipe.e2e.ts
│   ├── meal-planning/
│   │   ├── add-to-meal-plan.e2e.ts
│   │   └── view-meal-plan.e2e.ts
│   ├── grocery/
│   │   └── grocery-list.e2e.ts
│   └── onboarding/
│       └── onboarding.e2e.ts
└── types/
    └── index.ts             # Shared types for tests
```

## Configuration

### Detox Configuration

**Platform:** iOS only (iPhone 15 Pro simulator)
**Build Configurations:** Debug (development) and Release (production-like)
**Test Runner:** Jest
**App Behavior:** Fresh install for each test suite, device shutdown after tests

### Key Settings

- **Test Timeout:** 120 seconds per test
- **Setup Timeout:** 120 seconds for app initialization
- **App Reinstall:** True (clean state for each suite)
- **Device:** iPhone 15 Pro simulator

## Screen Objects

### Base Screen Pattern

All screen objects extend `BaseScreen` which provides common methods:

- `waitForDisplayed()` - Wait for screen to be visible
- `tapButton(testId)` - Tap element by testID
- `typeText(testId, text)` - Enter text in input
- `clearText(testId)` - Clear input field
- `scrollDown(amount)` - Scroll within screen
- `isVisible(testId)` - Check element visibility

### Screen Object Examples

Each screen object encapsulates:

1. Screen identifier
2. Element selectors (as testIDs)
3. Actions specific to that screen
4. State verification methods

**Example:** `AuthScreen` includes methods for sign in, sign up, password reset, with selectors for email/password inputs and buttons.

## Test Helpers

### Custom Matchers

Extended Detox matchers for common assertions:

- `toHaveText(elementId, text)` - Verify element text
- `toBeVisible(elementId)` - Verify element is visible
- `toNotExist(elementId)` - Verify element doesn't exist
- `toHaveLabel(elementId, label)` - Verify accessibility label

### Reusable Actions

Common test operations:

- `waitForLoading(screenId)` - Wait for loading to complete
- `scrollToElement(containerId, targetId)` - Scroll to specific element
- `tapBack()` - Navigate back
- `waitForToast()` - Wait for toast message
- `clearAndType(testId, text)` - Clear and enter text

### Test Data Utilities

Predefined test data:

- `testUsers.valid` - Existing test user credentials
- `testUsers.new` - Dynamically generated new user
- `waitForNetworkIdle()` - Wait for API calls to complete

## Test Scenarios

### Organization

Tests are organized by feature area:

- **Authentication:** Sign in, sign up, password recovery
- **Recipes:** Browse, search, view details, edit, favorites
- **Meal Planning:** Add to plan, view weekly plan
- **Grocery:** View list, check items, add items
- **Onboarding:** First-time user experience

### Test Pattern

Each test follows the Given-When-Then pattern:

1. **Given** - Set up initial state (navigate to screen, enter data)
2. **When** - Perform action (tap button, submit form)
3. **Then** - Verify outcome (new screen visible, success message)

### Example Tests

**Sign In Test:**

- Given: User is on auth screen
- When: User enters valid credentials and taps sign in
- Then: Home screen is displayed

**Recipe Browse Test:**

- Given: User is on home screen
- When: User navigates to recipes and taps first recipe
- Then: Recipe details screen shows title, ingredients, steps

## Component TestIDs

### Required TestIDs by Screen

**Authentication:**

- `auth-screen`, `email-input`, `password-input`
- `sign-in-button`, `sign-up-button`, `forgot-password-link`
- `error-message`

**Home:**

- `home-screen`, `greeting-text`
- `recipes-button`, `meal-plan-button`, `grocery-list-button`

**Recipes:**

- `recipe-list-screen`, `recipe-card-{id}`
- `recipe-details-screen`, `recipe-title`, `recipe-ingredients`, `recipe-steps`
- `search-input`, `favorite-button`

**Meal Plan:**

- `meal-plan-screen`, `day-view-{date}`, `add-meal-button`

**Grocery List:**

- `grocery-list-screen`, `ingredient-item-{id}`, `check-button`

**Profile:**

- `profile-screen`, `settings-button`, `preferences-button`

**Onboarding:**

- `onboarding-screen`, `skip-button`, `next-button`, `complete-button`

### TestID Integration Strategy

**Option 1: Direct testID Props**
Add `testID` prop directly to components:

```typescript
<Button testID="sign-in-button" onPress={handleSignIn}>Sign In</Button>
```

**Option 2: Wrapper Components**
Use testable wrapper components:

```typescript
<TestableTouch testID="sign-in-button" onPress={handleSignIn}>
  <Text>Sign In</Text>
</TestableTouch>
```

Both approaches are valid; direct props are simpler, wrappers provide consistency.

## Simulator Setup

### iOS Simulator Management

**Commands:**

- List simulators: `xcrun simctl list devices`
- Boot simulator: `xcrun simctl boot "iPhone 15 Pro"`
- Open app: `open -a Simulator`
- Install app: `xcrun simctl install booted /path/to/app.app`

**Setup Script:**
Shell script to boot simulator and prepare for testing.

## Package Scripts

### Available Commands

- `npm run e2e:build:ios` - Build debug app for testing
- `npm run e2e:test:ios` - Run E2E tests
- `npm run e2e:ios` - Build and run tests
- `npm run e2e:ios:release` - Build and run release configuration

### Dependencies

Required dev dependencies:

- `detox` - E2E testing framework
- `jest-circus` - Jest test runner
- `jest-environment-node` - Node test environment
- `@types/jest` - TypeScript types

## Migration Plan

### Phase 1: Foundation (Day 1)

1. Install Detox and dependencies
2. Create configuration files (detox.config.js, jest.config.js)
3. Create base classes (BaseScreen, helpers)
4. Add testIDs to one screen
5. Write first "smoke test" (launch app, find element)

**Success Criteria:** First passing E2E test

### Phase 2: Authentication (Days 2-3)

1. Add testIDs to all auth screens
2. Create AuthScreen page object
3. Write authentication test scenarios
4. Verify all auth flows work

**Success Criteria:** All authentication tests passing

### Phase 3: Core Features (Days 4-5)

1. Add testIDs to recipe, meal plan, grocery screens
2. Create corresponding screen objects
3. Write test scenarios for each feature
4. Verify end-to-end flows

**Success Criteria:** All core feature tests passing

### Phase 4: Refinement (Day 6)

1. Add testIDs to remaining screens (profile, onboarding)
2. Write remaining test scenarios
3. Review and optimize tests
4. Add edge cases and error scenarios
5. Document test suite

**Success Criteria:** Complete test suite with documentation

## Success Criteria

### Functional Requirements

- ✅ All critical user flows have E2E tests
- ✅ Tests run reliably on iOS simulator
- ✅ Test suite completes in reasonable time
- ✅ Tests use dedicated test backend
- ✅ Screen objects abstract all selectors

### Quality Requirements

- ✅ Tests are readable and follow Gherkin pattern
- ✅ UI changes only affect screen objects
- ✅ No hardcoded waits (use explicit waits)
- ✅ Proper test isolation (clean state per test)

### Documentation Requirements

- ✅ Design document (this file)
- ✅ Screen object documentation
- ✅ Test scenario documentation
- ✅ Setup instructions for contributors

## Future Considerations

### Potential Enhancements

- Add CI/CD integration (GitHub Actions)
- Add Android platform support
- Add visual regression testing
- Add performance testing
- Add API mocking for offline scenarios

### Scaling Considerations

- Parallel test execution
- Test suite organization (smoke vs. full)
- Test data management
- Screenshot capture on failures
- Video recording for debugging

## References

- Detox Documentation: https://wix.github.io/Detox/
- Page Object Model: https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/
- React Native Testing: https://reactnative.dev/docs/testing-overview
