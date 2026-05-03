# Detox E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a maintainable local iOS Detox E2E test suite for Cookkit’s critical routes and flows.

**Architecture:** Use Detox with a dedicated E2E Jest config and Page Object Model under `e2e/`. Keep app-facing changes limited to deterministic E2E boot flags and stable `testID` props on existing Expo Router screens/components. Use iOS simulator only for the first implementation; Android and CI remain future work.

**Tech Stack:** Expo SDK 55, React Native 0.83, Expo Router, Bun scripts, Detox, Jest/Jest Circus, TypeScript, iOS simulator.

---

## Pre-Execution Notes

- Start in an isolated worktree. The user selected project-local `.worktrees/`; before creating it, add `.worktrees/` to `.gitignore` because the current repo does not ignore that path.
- Current working tree contains unrelated route moves/deletions around `app/debug.tsx`, `app/import-youtube.tsx`, `app/search.tsx`, and `app/(misc)/`. Do not revert or overwrite those changes.
- Do not create commits unless the user explicitly asks. The plan includes verification checkpoints instead of commit steps.
- The design spec is `docs/superpowers/specs/2026-05-03-detox-e2e-testing-design.md`.

## File Map

- Modify: `.gitignore` to ignore `.worktrees/` before worktree creation.
- Modify: `package.json` to add Detox scripts and dev dependencies.
- Modify: `app.json` to add the Detox Expo config plugin.
- Create: `detox.config.js` for iOS debug/release configurations.
- Create: `e2e/jest.config.js`, `e2e/init.js`, `e2e/tsconfig.json` for the Detox test runner.
- Create: `e2e/helpers/actions.ts`, `e2e/helpers/matchers.ts`, `e2e/helpers/testData.ts`.
- Create: `e2e/screens/BaseScreen.ts`, `e2e/screens/AuthScreen.ts`, `e2e/screens/HomeScreen.ts`, `e2e/screens/SearchScreen.ts`, `e2e/screens/RecipeDetailsScreen.ts`, `e2e/screens/MealPlanScreen.ts`, `e2e/screens/GroceryListScreen.ts`, `e2e/screens/OnboardingScreen.ts`, `e2e/screens/ProfileScreen.ts`.
- Create: E2E scenarios under `e2e/scenarios/**`.
- Create: `utils/e2e-flags.ts` and `constants/test-ids.ts` so app code and E2E tests share stable identifiers.
- Modify: `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/*.tsx`, `app/onboarding/*.tsx`, `app/(misc)/search.tsx`, `app/meal-plan/index.tsx`, `app/grocery-list/index.tsx`, `app/recipes/[recipeId]/index.tsx`, `components/auth/AuthInput.tsx`, and selected feature components to expose test IDs.

---

## Task 1: Isolated Workspace Setup

**Files:**
- Modify: `.gitignore`
- Create worktree: `.worktrees/detox-e2e-testing`

- [ ] **Step 1: Add project-local worktrees to `.gitignore`**

Add this near the other local/cache entries:

```gitignore
.worktrees/
```

- [ ] **Step 2: Verify `.worktrees/` is ignored**

Run:

```bash
git check-ignore -q .worktrees && echo ".worktrees ignored"
```

Expected:

```text
.worktrees ignored
```

- [ ] **Step 3: Create the isolated branch/worktree**

Run from repo root:

```bash
git worktree add .worktrees/detox-e2e-testing -b feature/detox-e2e-testing
```

Expected: a new worktree at `.worktrees/detox-e2e-testing` on branch `feature/detox-e2e-testing`.

- [ ] **Step 4: Install dependencies in the worktree**

Run:

```bash
bun install
```

Expected: install completes and preserves `bun.lockb`.

- [ ] **Step 5: Verify baseline**

Run:

```bash
bun run typecheck
bun run test
```

Expected: both pass before Detox changes. If baseline fails, stop and report the exact failures before proceeding.

---

## Task 2: Detox Dependencies, Scripts, and Expo Config

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `detox.config.js`
- Create: `e2e/jest.config.js`
- Create: `e2e/init.js`
- Create: `e2e/tsconfig.json`

- [ ] **Step 1: Add Detox dependencies**

Run:

```bash
bun add -d detox @config-plugins/detox jest-circus jest-environment-node
```

Expected: `package.json` and `bun.lockb` include the new dev dependencies. `@types/jest` already exists.

- [ ] **Step 2: Add package scripts**

Update `package.json` scripts with:

```json
{
  "e2e:build:ios": "EXPO_PUBLIC_E2E=true detox build -c ios.sim.debug",
  "e2e:test:ios": "EXPO_PUBLIC_E2E=true detox test -c ios.sim.debug",
  "e2e:ios": "bun run e2e:build:ios && bun run e2e:test:ios",
  "e2e:build:ios:release": "EXPO_PUBLIC_E2E=true detox build -c ios.sim.release",
  "e2e:test:ios:release": "EXPO_PUBLIC_E2E=true detox test -c ios.sim.release",
  "e2e:ios:release": "bun run e2e:build:ios:release && bun run e2e:test:ios:release"
}
```

Keep existing scripts unchanged.

- [ ] **Step 3: Add the Detox Expo config plugin**

In `app.json`, add the plugin entry to the existing `expo.plugins` array:

```json
[
  "@config-plugins/detox",
  {
    "skipProguard": true
  }
]
```

Keep the existing iPhone-only setting `expo.ios.supportsTablet: false`.

- [ ] **Step 4: Create `detox.config.js`**

Create:

```javascript
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/Cookkit.app",
      build:
        "EXPO_PUBLIC_E2E=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/Cookkit.app",
      build:
        "EXPO_PUBLIC_E2E=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 15 Pro",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
  },
};
```

- [ ] **Step 5: Create `e2e/jest.config.js`**

Create:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  setupFilesAfterEnv: ["<rootDir>/e2e/init.js"],
  testMatch: ["<rootDir>/e2e/scenarios/**/*.e2e.ts"],
  testTimeout: 120000,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/e2e/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
  },
};
```

- [ ] **Step 6: Create `e2e/tsconfig.json`**

Create:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "detox"],
    "noEmit": true
  },
  "include": ["./**/*.ts", "../constants/test-ids.ts"]
}
```

- [ ] **Step 7: Create `e2e/init.js`**

Create:

```javascript
const detox = require("detox");
const config = require("../detox.config");

beforeAll(async () => {
  await detox.init(config, { launchApp: false });
}, 120000);

beforeEach(async () => {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: {
      notifications: "YES",
      camera: "YES",
      photos: "YES",
      microphone: "YES",
    },
  });
});

afterAll(async () => {
  await detox.cleanup();
});
```

- [ ] **Step 8: Verify config compiles**

Run:

```bash
bunx tsc --noEmit --project e2e/tsconfig.json
```

Expected: no TypeScript errors.

---

## Task 3: E2E Runtime Flags and Shared Test IDs

**Files:**
- Create: `utils/e2e-flags.ts`
- Create: `constants/test-ids.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create E2E runtime flag helper**

Create `utils/e2e-flags.ts`:

```typescript
export const IS_E2E = process.env.EXPO_PUBLIC_E2E === "true";
```

- [ ] **Step 2: Create shared test IDs**

Create `constants/test-ids.ts`:

```typescript
export const TEST_IDS = {
  appRoot: "app-root",
  auth: {
    signInScreen: "auth-sign-in-screen",
    signUpScreen: "auth-sign-up-screen",
    forgotPasswordScreen: "auth-forgot-password-screen",
    emailInput: "auth-email-input",
    passwordInput: "auth-password-input",
    confirmPasswordInput: "auth-confirm-password-input",
    signInButton: "auth-sign-in-button",
    signUpButton: "auth-sign-up-button",
    guestButton: "auth-guest-button",
    forgotPasswordLink: "auth-forgot-password-link",
    errorMessage: "auth-error-message",
  },
  onboarding: {
    screen: "onboarding-screen",
    tutorialScreen: "onboarding-tutorial-screen",
    nextButton: "onboarding-next-button",
    skipButton: "onboarding-skip-button",
    completeButton: "onboarding-complete-button",
  },
  home: {
    screen: "home-screen",
    pantryList: "home-pantry-list",
    recipeSheet: "home-recipe-sheet",
    searchButton: "home-search-button",
    addIngredientButton: "home-add-ingredient-button",
    profileButton: "home-profile-button",
  },
  search: {
    screen: "search-screen",
    input: "search-input",
    filtersButton: "search-filters-button",
    filtersSheet: "search-filters-sheet",
    clearFiltersButton: "search-clear-filters-button",
    recipeResults: "search-recipe-results",
    ingredientResults: "search-ingredient-results",
  },
  recipe: {
    detailsScreen: "recipe-details-screen",
    title: "recipe-title",
    ingredients: "recipe-ingredients",
    steps: "recipe-steps",
    addToPlanButton: "recipe-add-to-plan-button",
    addToPlanModal: "recipe-add-to-plan-modal",
    favoriteButton: "recipe-favorite-button",
  },
  mealPlan: {
    screen: "meal-plan-screen",
    addRecipeButton: "meal-plan-add-recipe-button",
    previousWeekButton: "meal-plan-previous-week-button",
    nextWeekButton: "meal-plan-next-week-button",
  },
  groceryList: {
    screen: "grocery-list-screen",
    emptyState: "grocery-list-empty-state",
    itemList: "grocery-list-items",
    clearCheckedButton: "grocery-list-clear-checked-button",
    clearAllButton: "grocery-list-clear-all-button",
  },
  profile: {
    screen: "profile-screen",
    preferencesButton: "profile-preferences-button",
    achievementsButton: "profile-achievements-button",
    mealPlanButton: "profile-meal-plan-button",
  },
} as const;
```

- [ ] **Step 3: Wrap the app root with `testID`**

In `app/_layout.tsx`, import `TEST_IDS` and set the root gesture view:

```tsx
<GestureHandlerRootView testID={TEST_IDS.appRoot} className="flex-1 bg-background">
```

- [ ] **Step 4: Make E2E boot deterministic**

In `app/_layout.tsx`, import `IS_E2E` and update `useOnboardingCheck`:

```typescript
function useOnboardingCheck(router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    setTimeout(() => {
      if (IS_E2E) {
        storage.set(ONBOARDING_COMPLETED_KEY, true);
        SplashScreen.hideAsync();
        return;
      }

      const completed = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
      if (completed !== true) {
        router.replace("/onboarding");
      }
      SplashScreen.hideAsync();
    }, 0);
  }, [router]);
}
```

- [ ] **Step 5: Verify app TypeScript**

Run:

```bash
bun run typecheck
```

Expected: no TypeScript errors.

---

## Task 4: Page Object Foundation and Smoke Test

**Files:**
- Create: `e2e/helpers/matchers.ts`
- Create: `e2e/helpers/actions.ts`
- Create: `e2e/screens/BaseScreen.ts`
- Create: `e2e/screens/HomeScreen.ts`
- Create: `e2e/scenarios/smoke/launch.e2e.ts`
- Modify: `app/index.tsx`
- Modify: `components/Pantry/PantryWrapper.tsx`

- [ ] **Step 1: Create matcher helpers**

Create `e2e/helpers/matchers.ts`:

```typescript
import { by, element } from "detox";

export function byTestId(testId: string) {
  return element(by.id(testId));
}
```

- [ ] **Step 2: Create reusable actions**

Create `e2e/helpers/actions.ts`:

```typescript
import { by, device, element, waitFor } from "detox";
import { byTestId } from "./matchers";

export async function waitForVisible(testId: string, timeout = 10000) {
  await waitFor(byTestId(testId)).toBeVisible().withTimeout(timeout);
}

export async function tapById(testId: string) {
  await byTestId(testId).tap();
}

export async function replaceTextById(testId: string, text: string) {
  await byTestId(testId).replaceText(text);
  await device.pressBack();
}

export async function scrollToElement(containerId: string, targetId: string) {
  await waitFor(element(by.id(targetId)))
    .toBeVisible()
    .whileElement(by.id(containerId))
    .scroll(200, "down");
}
```

- [ ] **Step 3: Create `BaseScreen`**

Create `e2e/screens/BaseScreen.ts`:

```typescript
import { waitForVisible, tapById, replaceTextById } from "../helpers/actions";

export class BaseScreen {
  constructor(readonly screenId: string) {}

  async waitForDisplayed() {
    await waitForVisible(this.screenId);
  }

  async tapButton(testId: string) {
    await tapById(testId);
  }

  async typeText(testId: string, text: string) {
    await replaceTextById(testId, text);
  }
}
```

- [ ] **Step 4: Add home screen test IDs**

In `app/index.tsx`, add `testID` to the toolbar buttons and the main screen target:

```tsx
<Stack.Toolbar.Button
  testID={TEST_IDS.home.searchButton}
  icon="magnifyingglass"
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/search");
  }}
/>
```

Add equivalent `TEST_IDS.home.addIngredientButton` and `TEST_IDS.home.profileButton` to the other toolbar buttons.

In `components/Pantry/PantryWrapper.tsx`, add:

```tsx
<Animated.View testID={TEST_IDS.home.screen} className="relative flex-1 bg-black rounded-xl">
```

- [ ] **Step 5: Create home page object**

Create `e2e/screens/HomeScreen.ts`:

```typescript
import { TEST_IDS } from "~/constants/test-ids";
import { BaseScreen } from "./BaseScreen";

export class HomeScreen extends BaseScreen {
  constructor() {
    super(TEST_IDS.home.screen);
  }

  async openSearch() {
    await this.tapButton(TEST_IDS.home.searchButton);
  }

  async openProfile() {
    await this.tapButton(TEST_IDS.home.profileButton);
  }
}
```

- [ ] **Step 6: Create launch smoke test**

Create `e2e/scenarios/smoke/launch.e2e.ts`:

```typescript
import { HomeScreen } from "../../screens/HomeScreen";

describe("launch", () => {
  it("opens the app on the home pantry screen", async () => {
    const home = new HomeScreen();
    await home.waitForDisplayed();
  });
});
```

- [ ] **Step 7: Verify smoke build and test**

Run:

```bash
bun run e2e:build:ios
bun run e2e:test:ios -- --testNamePattern="opens the app"
```

Expected: the app builds for `iPhone 15 Pro` and the smoke test passes.

---

## Task 5: Auth Screen Selectors and Mock Auth Flow

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `components/auth/AuthInput.tsx`
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/forgot-password.tsx`
- Create: `e2e/screens/AuthScreen.ts`
- Create: `e2e/scenarios/auth/sign-in.e2e.ts`
- Create: `e2e/scenarios/auth/sign-up.e2e.ts`

- [ ] **Step 1: Re-enable auth provider with E2E mock strategy**

In `app/_layout.tsx`, import:

```typescript
import { AuthProvider, MockAuthStrategy, SupabaseAuthStrategy } from "~/auth";
import { IS_E2E } from "~/utils/e2e-flags";
```

Use a stable strategy instance:

```typescript
const authStrategy = IS_E2E ? new MockAuthStrategy() : new SupabaseAuthStrategy();
```

Wrap the app contents:

```tsx
<AuthProvider strategy={authStrategy} autoInitialize={true}>
  <NotificationProvider>
    <KeyboardProvider>
      <StatusBar style="auto" />
      <AnimatedStack />
      <Toaster visibleToasts={2} position="bottom-center" offset={80} />
      <PortalHost />
    </KeyboardProvider>
  </NotificationProvider>
</AuthProvider>
```

- [ ] **Step 2: Add `testID` support to `AuthInput`**

Extend `AuthInputProps`:

```typescript
testID?: string;
```

Pass it to `TextInput`:

```tsx
<TextInput
  testID={testID}
  accessibilityLabel={label}
  value={value}
  onChangeText={onChangeText}
  ...
/>
```

- [ ] **Step 3: Add sign-in selectors**

In `app/(auth)/sign-in.tsx`, add screen and element test IDs:

```tsx
<AuthContainer testID={TEST_IDS.auth.signInScreen}>
  ...
  <AuthInput testID={TEST_IDS.auth.emailInput} label="Email" ... />
  <AuthInput testID={TEST_IDS.auth.passwordInput} label="Password" ... />
  <Pressable testID={TEST_IDS.auth.forgotPasswordLink} accessibilityRole="link">
  ...
  <Button testID={TEST_IDS.auth.signInButton} ...>
  ...
  <Button testID={TEST_IDS.auth.guestButton} variant="ghost" ...>
```

If `AuthContainer` does not accept view props, extend it to forward `testID` to its root `View`.

- [ ] **Step 4: Add sign-up and forgot-password selectors**

Apply the same pattern:

```tsx
<AuthContainer testID={TEST_IDS.auth.signUpScreen}>
<AuthInput testID={TEST_IDS.auth.emailInput} label="Email" ... />
<AuthInput testID={TEST_IDS.auth.passwordInput} label="Password" ... />
<AuthInput testID={TEST_IDS.auth.confirmPasswordInput} label="Confirm Password" ... />
<Button testID={TEST_IDS.auth.signUpButton} ...>
```

For forgot password:

```tsx
<AuthContainer testID={TEST_IDS.auth.forgotPasswordScreen}>
```

- [ ] **Step 5: Create auth page object**

Create `e2e/screens/AuthScreen.ts`:

```typescript
import { TEST_IDS } from "~/constants/test-ids";
import { BaseScreen } from "./BaseScreen";

export class AuthScreen extends BaseScreen {
  constructor(screenId = TEST_IDS.auth.signInScreen) {
    super(screenId);
  }

  async signIn(email: string, password: string) {
    await this.typeText(TEST_IDS.auth.emailInput, email);
    await this.typeText(TEST_IDS.auth.passwordInput, password);
    await this.tapButton(TEST_IDS.auth.signInButton);
  }

  async continueAsGuest() {
    await this.tapButton(TEST_IDS.auth.guestButton);
  }

  async signUp(email: string, password: string) {
    await this.typeText(TEST_IDS.auth.emailInput, email);
    await this.typeText(TEST_IDS.auth.passwordInput, password);
    await this.typeText(TEST_IDS.auth.confirmPasswordInput, password);
    await this.tapButton(TEST_IDS.auth.signUpButton);
  }
}
```

- [ ] **Step 6: Create test data helper**

Create `e2e/helpers/testData.ts`:

```typescript
export const testUsers = {
  valid: {
    email: "e2e@example.com",
    password: "ValidPassword123!",
  },
  unique() {
    return {
      email: `e2e-${Date.now()}@example.com`,
      password: "ValidPassword123!",
    };
  },
};
```

- [ ] **Step 7: Add auth scenarios**

Create `e2e/scenarios/auth/sign-in.e2e.ts`:

```typescript
import { HomeScreen } from "../../screens/HomeScreen";

describe("auth sign in", () => {
  it("allows guest sign in through the mock auth provider", async () => {
    const home = new HomeScreen();
    await home.waitForDisplayed();
  });
});
```

Create `e2e/scenarios/auth/sign-up.e2e.ts`:

```typescript
import { AuthScreen } from "../../screens/AuthScreen";
import { HomeScreen } from "../../screens/HomeScreen";
import { testUsers } from "../../helpers/testData";

describe("auth sign up", () => {
  it("creates an account with mock auth and lands on home", async () => {
    await device.openURL({ url: "cookkit://sign-up" });
    const user = testUsers.unique();
    const auth = new AuthScreen();
    await auth.waitForDisplayed();
    await auth.signUp(user.email, user.password);
    await new HomeScreen().waitForDisplayed();
  });
});
```

If Expo Router deep link paths differ during testing, replace `device.openURL` with navigation through visible links and keep the page object API unchanged.

- [ ] **Step 8: Verify auth flow**

Run:

```bash
bun run typecheck
bun run e2e:test:ios -- e2e/scenarios/auth/sign-up.e2e.ts
```

Expected: TypeScript passes and the auth scenario passes using the mock strategy.

---

## Task 6: Search, Recipe Details, Meal Plan, and Grocery Selectors

**Files:**
- Modify: `app/(misc)/search.tsx`
- Modify: `app/recipes/[recipeId]/index.tsx`
- Modify: `components/Recipe/Details/AddToPlanHeaderButton.tsx`
- Modify: `components/Recipe/Details/AddToPlanModal.tsx`
- Modify: `components/Recipe/Details/BottomActionBar.tsx`
- Modify: `app/meal-plan/index.tsx`
- Modify: `app/grocery-list/index.tsx`
- Create: related page objects

- [ ] **Step 1: Add search selectors**

In `app/(misc)/search.tsx`, add:

```tsx
<View testID={TEST_IDS.search.screen} ...>
<TextInput testID={TEST_IDS.search.input} ... />
<Button testID={TEST_IDS.search.filtersButton} accessibilityLabel="Open filters" ... />
<BottomSheetView testID={TEST_IDS.search.filtersSheet}>
<Button testID={TEST_IDS.search.clearFiltersButton} ... />
```

- [ ] **Step 2: Add recipe details selectors**

In `app/recipes/[recipeId]/index.tsx`, add:

```tsx
<Animated.ScrollView testID={TEST_IDS.recipe.detailsScreen} ...>
<Text testID={TEST_IDS.recipe.title} ...>
<IngredientList testID={TEST_IDS.recipe.ingredients} ... />
```

If child components do not forward `testID`, wrap them in `View` with the test ID instead.

- [ ] **Step 3: Add add-to-plan selectors**

In `components/Recipe/Details/AddToPlanHeaderButton.tsx`:

```tsx
<Button testID={TEST_IDS.recipe.addToPlanButton} ...>
```

In `components/Recipe/Details/AddToPlanModal.tsx`:

```tsx
<View testID={TEST_IDS.recipe.addToPlanModal} ...>
```

- [ ] **Step 4: Add meal plan selectors**

In `app/meal-plan/index.tsx`, add:

```tsx
<View testID={TEST_IDS.mealPlan.screen} ...>
<Pressable testID={TEST_IDS.mealPlan.addRecipeButton} accessibilityLabel="Add recipe" ...>
<Pressable testID={TEST_IDS.mealPlan.previousWeekButton} accessibilityLabel="Previous week" ...>
<Pressable testID={TEST_IDS.mealPlan.nextWeekButton} accessibilityLabel="Next week" ...>
```

- [ ] **Step 5: Add grocery list selectors**

In `app/grocery-list/index.tsx`, add:

```tsx
<View testID={TEST_IDS.groceryList.screen} ...>
<FlatList testID={TEST_IDS.groceryList.itemList} ... />
<View testID={TEST_IDS.groceryList.emptyState} ...>
```

Add action button test IDs for clear checked and clear all where those controls are rendered.

- [ ] **Step 6: Create page objects**

Create `SearchScreen`, `RecipeDetailsScreen`, `MealPlanScreen`, and `GroceryListScreen` classes following `HomeScreen`. Each class should expose only user actions used by scenarios:

```typescript
export class SearchScreen extends BaseScreen {
  constructor() {
    super(TEST_IDS.search.screen);
  }

  async search(query: string) {
    await this.typeText(TEST_IDS.search.input, query);
  }

  async openFilters() {
    await this.tapButton(TEST_IDS.search.filtersButton);
  }
}
```

- [ ] **Step 7: Verify selectors compile**

Run:

```bash
bun run typecheck
bunx tsc --noEmit --project e2e/tsconfig.json
```

Expected: both pass.

---

## Task 7: Core E2E Scenarios

**Files:**
- Create: `e2e/scenarios/recipes/search-recipes.e2e.ts`
- Create: `e2e/scenarios/recipes/view-recipe-details.e2e.ts`
- Create: `e2e/scenarios/meal-planning/view-meal-plan.e2e.ts`
- Create: `e2e/scenarios/grocery/grocery-list.e2e.ts`
- Create: `e2e/scenarios/onboarding/onboarding.e2e.ts`

- [ ] **Step 1: Add search scenario**

Create:

```typescript
import { HomeScreen } from "../../screens/HomeScreen";
import { SearchScreen } from "../../screens/SearchScreen";

describe("recipe search", () => {
  it("opens search and accepts a query", async () => {
    const home = new HomeScreen();
    await home.waitForDisplayed();
    await home.openSearch();

    const search = new SearchScreen();
    await search.waitForDisplayed();
    await search.search("pasta");
  });
});
```

- [ ] **Step 2: Add recipe details scenario**

Create a scenario that opens search, searches for a seeded recipe term, taps the first recipe result, and waits for `TEST_IDS.recipe.detailsScreen` and `TEST_IDS.recipe.title`.

If local data is empty in a fresh Detox install, stop and add a deterministic E2E seed step before continuing.

- [ ] **Step 3: Add meal plan scenario**

Create a scenario that opens `/meal-plan` from the visible profile/home navigation path or via deep link and waits for `TEST_IDS.mealPlan.screen`.

- [ ] **Step 4: Add grocery list scenario**

Create a scenario that opens `/grocery-list` and asserts either the item list or empty state is visible:

```typescript
import { expect } from "detox";
import { TEST_IDS } from "~/constants/test-ids";
import { byTestId } from "../../helpers/matchers";

describe("grocery list", () => {
  it("shows the grocery list screen", async () => {
    await device.openURL({ url: "cookkit://grocery-list" });
    await expect(byTestId(TEST_IDS.groceryList.screen)).toBeVisible();
  });
});
```

- [ ] **Step 5: Add onboarding scenario**

Launch with onboarding reset by passing launch args:

```typescript
await device.launchApp({
  newInstance: true,
  delete: true,
  launchArgs: {
    e2eShowOnboarding: "true",
  },
});
```

Update `useOnboardingCheck` to honor `e2eShowOnboarding` before forcing onboarding complete, then assert onboarding screen and navigation buttons.

- [ ] **Step 6: Verify each scenario independently**

Run:

```bash
bun run e2e:test:ios -- e2e/scenarios/recipes/search-recipes.e2e.ts
bun run e2e:test:ios -- e2e/scenarios/grocery/grocery-list.e2e.ts
```

Expected: each focused scenario passes before running the full suite.

---

## Task 8: Documentation and Final Verification

**Files:**
- Create: `e2e/README.md`
- Modify: `docs/superpowers/specs/2026-05-03-detox-e2e-testing-design.md` only if implementation decisions need to be recorded.

- [ ] **Step 1: Create E2E README**

Create `e2e/README.md`:

```markdown
# E2E Tests

Cookkit uses Detox for local iOS E2E tests.

## Setup

```bash
brew tap wix/brew
brew install applesimutils
bun install
```

## Run

```bash
bun run e2e:build:ios
bun run e2e:test:ios
```

## Conventions

- Page objects live in `e2e/screens`.
- Scenarios live in `e2e/scenarios`.
- App selectors come from `constants/test-ids.ts`.
- Prefer explicit Detox waits over hardcoded sleeps.
- Keep E2E-only behavior behind `EXPO_PUBLIC_E2E=true`.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
bun run typecheck
bun run test
bunx prettier --check package.json app.json detox.config.js e2e constants/test-ids.ts utils/e2e-flags.ts
bun run e2e:build:ios
bun run e2e:test:ios
```

Expected:

```text
typecheck passes
Jest unit/integration suite passes
Prettier check passes
Detox iOS build passes
Detox iOS suite passes
```

- [ ] **Step 3: Capture known local prerequisites**

If `applesimutils`, Xcode command line tools, simulator availability, or Bun version blocks local E2E execution, record the exact command output in `e2e/README.md` under a `Troubleshooting` section and stop for user confirmation.

## Success Criteria

- `bun run typecheck` passes.
- `bun run test` passes.
- `bun run e2e:build:ios` builds the iOS simulator app through `ios/Cookkit.xcworkspace`.
- `bun run e2e:test:ios` passes the smoke test and the implemented auth/search/core scenarios.
- Test selectors are centralized in `constants/test-ids.ts`.
- E2E-only boot behavior is gated behind `EXPO_PUBLIC_E2E=true`.
- No unrelated dirty-tree changes are reverted.
