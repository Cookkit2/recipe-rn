# Achievement System End-to-End Testing Guide

This document provides comprehensive testing instructions for the Achievement System feature.

## Overview

The Achievement System includes:

- **Achievements**: Unlocks for streaks, recipe milestones, ingredient tracking, waste reduction, and social sharing
- **Streaks**: Tracks consecutive cooking days
- **Challenges**: Daily and weekly challenges with rewards
- **Notifications**: Celebration notifications for achievement unlocks
- **UI Components**: Badges, displays, cards, and dedicated achievements screen

## Prerequisites

1. App must be running (`npm run dev`)
2. Database must be initialized with seeded achievements
3. User must be signed in

## Automated Verification

Run the automated verification script:

```bash
npx tsx scripts/verify-achievement-system.ts
```

This will check:

- Database schema (4 new tables)
- Service layer availability
- Integration points
- UI component existence

## Manual Testing Steps

### 1. Cook a Recipe - Verify Cooking History Recording

**Steps:**

1. Navigate to the recipe list
2. Select a recipe to cook
3. Go through the cooking steps
4. Complete the recipe (tap "Finish" on final step)

**Expected Results:**

- ✅ Recipe is marked as cooked
- ✅ Cooking history entry is created in database
- ✅ Achievement check is triggered automatically

**Verification:**

- Check that the recipe appears in your cooked recipes history
- Verify no errors in console related to achievement checking

---

### 2. Check Streak Calculation - Verify Streak Count

**Steps:**

1. Navigate to Profile screen
2. Look at the Achievements card
3. Note the current streak display

**Expected Results:**

- ✅ Current streak is displayed (or hidden if 0)
- ✅ Streak count matches consecutive cooking days
- ✅ Fire emoji (🔥) is shown for streaks > 0

**Verification:**

- Count manually how many consecutive days you've cooked
- Verify the displayed number matches

---

### 3. Cook Recipes on Consecutive Days - Verify Streak Increases

**Steps:**

1. Note current streak count
2. Cook a recipe today
3. Wait until tomorrow (or simulate by adjusting device date)
4. Cook another recipe
5. Check streak display again

**Expected Results:**

- ✅ Streak increases by 1 after cooking on consecutive days
- ✅ Progress bar shows progress toward next streak milestone
- ✅ Motivational message updates

**Verification:**

- Streak should be (previous streak + 1) after consecutive day cooking
- If a day is missed, streak should reset to 1

---

### 4. Reach Recipe Milestone - Verify Achievement Unlocks

**Steps:**

1. Check current total recipes cooked (in Profile > Achievements)
2. Cook recipes until reaching a milestone (e.g., 5, 10, 25 recipes)
3. Watch for achievement unlock notification

**Expected Results:**

- ✅ Achievement notification appears when milestone is reached
- ✅ Achievement shows: icon, title, description, XP reward
- ✅ Achievement is marked as "unlocked" in database
- ✅ Progress updates for next milestone

**Common Recipe Milestones:**

- 1 recipe: "First Dish" (🍽️)
- 5 recipes: "Cooking Novice" (👨‍🍳)
- 10 recipes: "Kitchen Regular" (🏠)
- 25 recipes: "Recipe Master" (👑)
- 50 recipes: "Cooking Legend" (🌟)

**Verification:**

- Navigate to Profile > Achievements
- Find the recipe you just unlocked
- Verify it shows as unlocked (checkmark icon, full opacity)

---

### 5. Verify Notification is Shown for Achievement Unlock

**Steps:**

1. Trigger any achievement unlock (cook milestone recipe, track ingredient, etc.)
2. Wait a moment for notification to trigger
3. Check notification center/banner

**Expected Results:**

- ✅ Notification appears with achievement icon
- ✅ Notification includes achievement title
- ✅ Notification shows XP earned
- ✅ Tapping notification opens achievements screen

**Verification:**

- Pull down notification center
- Look for achievement notification
- Verify tapping it navigates to achievements screen

---

### 6. Navigate to Achievements Screen - Verify Achievement Appears

**Steps:**

1. Go to Profile tab
2. Tap on Achievements card
3. Browse the Achievements tab
4. Switch to Challenges tab

**Expected Results:**

- ✅ Achievements screen opens with tab switcher
- ✅ Achievements tab shows all achievements grouped by category
- ✅ Unlocked achievements show checkmark and full opacity
- ✅ In-progress achievements show progress bar
- ✅ Locked achievements show lock icon and grayed out
- ✅ Challenges tab shows active and available challenges

**Categories:**

- 🔥 Streak Achievements
- 🍽️ Recipe Milestones
- 🥕 Ingredients Tracked
- ♻️ Waste Reduction
- 📤 Social Sharing

**Verification:**

- Find the achievement you just unlocked
- Verify its visual state matches its status
- Check that progress bars display correctly

---

### 7. Start a Daily Challenge - Verify it Appears in Active Challenges

**Steps:**

1. Navigate to Profile > Achievements
2. Switch to Challenges tab
3. Find an available daily challenge
4. Tap "Start" on the challenge
5. Return to challenges list

**Expected Results:**

- ✅ Challenge moves from "available" to "active" state
- ✅ Challenge shows progress bar (0/complete)
- ✅ Timer shows time remaining until challenge expires
- ✅ Challenge appears in active challenges section

**Common Daily Challenges:**

- Cook 3 recipes today
- Track 5 new ingredients
- Cook a breakfast recipe

**Verification:**

- Challenge should show in "Active" section
- Status should be "active" with progress bar at 0

---

### 8. Complete Challenge Requirements - Verify Challenge Completes

**Steps:**

1. Start a daily challenge
2. Complete the challenge requirements (e.g., cook 3 recipes)
3. Return to challenges screen
4. Tap "Claim" on the completed challenge

**Expected Results:**

- ✅ Challenge progress updates as you complete requirements
- ✅ When complete, challenge shows checkmark icon
- ✅ "Claim" button becomes enabled
- ✅ After claiming, XP is awarded
- ✅ Challenge moves to "Completed" section

**Verification:**

- Progress bar should reach 100%
- Status should change to "completed"
- XP should be added to total
- Challenge should disappear from active list

---

## Integration Point Verification

### Recipe Completion Flow

**File:** `store/RecipeStepsContext.tsx`

**What to verify:**

- ✅ `achievementService.checkAchievements()` is called after `database.recordCooking()`
- ✅ Call is wrapped in try-catch to prevent cooking failure
- ✅ No console errors related to achievements

**Test:**

```javascript
// In RecipeStepsContext.tsx line ~90
await achievementService.checkAchievements();
```

### Pantry Item Creation Flow

**File:** `hooks/queries/usePantryQueries.ts`

**What to verify:**

- ✅ `achievementService.checkAchievements()` is called in:
  - `useUpdatePantryItem` (line ~75)
  - `useAddPantryItem` (line ~108)
  - `useAddPantryItems` (line ~141)
  - `useAddPantryItemsWithMetadata` (line ~182)
- ✅ All calls are wrapped in try-catch

**Test:**
Add or update a pantry item and verify:

- Item is added/updated successfully
- Achievement progress updates for ingredient tracking

### React Query Hooks

**Files:**

- `hooks/queries/useAchievementQueries.ts`
- `hooks/queries/useChallengeQueries.ts`

**What to verify:**

- ✅ Hooks export: `useAchievements`, `useAchievementProgress`, `useStreakInfo`
- ✅ Hooks export: `useChallenges`, `useStartChallenge`, `useCompleteChallenge`
- ✅ Query keys are properly defined
- ✅ Mutations invalidate related queries

---

## Service Layer Testing

### StreakService

**File:** `data/services/StreakService.ts`

**Tests:**

1. `calculateCurrentStreak()` - Returns consecutive cooking days
2. `calculateLongestStreak()` - Returns all-time highest streak
3. `isStreakActive()` - Returns true if streak > 0
4. `getDaysUntilStreakBreaks()` - Days until streak resets

**Verification:**

- Cook on consecutive days → streak increases
- Skip a day → streak resets to 0
- Values match database records

### AchievementService

**File:** `data/services/AchievementService.ts`

**Tests:**

1. `checkAchievements()` - Checks all visible achievements
2. `getProgress()` - Gets progress for specific achievement
3. `getAllProgress()` - Gets progress for all achievements
4. `unlockAchievement()` - Unlocks an achievement

**Verification:**

- Progress updates correctly
- Achievements unlock when criteria met
- Notifications are triggered for unlocks
- XP is awarded

### ChallengeService

**File:** `data/services/ChallengeService.ts`

**Tests:**

1. `getActiveChallenges()` - Returns active challenges
2. `startChallenge()` - Starts a new challenge
3. `updateProgress()` - Updates challenge progress
4. `completeChallenge()` - Marks challenge as complete
5. `claimRewards()` - Awards XP and closes challenge

**Verification:**

- Challenges can be started
- Progress updates with user actions
- Challenges complete when criteria met
- XP is awarded on claim

---

## UI Component Testing

### AchievementBadge

**File:** `components/Profile/AchievementBadge.tsx`

**States to test:**

- Locked: Grayed out, lock icon
- Unlocked: Full opacity, checkmark, XP badge
- In-progress: Partial opacity, progress bar

### StreakDisplay

**File:** `components/Profile/StreakDisplay.tsx`

**States to test:**

- No streak (0): Hidden or minimal display
- Active streak: Fire emoji, count, progress bar
- Longest streak: Secondary info

### ChallengeCard

**File:** `components/Profile/ChallengeCard.tsx`

**States to test:**

- Available: "Start" button
- Active: Progress bar, timer
- Completed: Checkmark, "Claim" button
- Expired: Lock icon, grayed out

### AchievementsCard

**File:** `components/Profile/AchievementsCard.tsx`

**Verify:**

- Shows unlocked/total count
- Shows current streak (if > 0)
- Shows top 3 achievements
- Tapping navigates to full screen

### AchievementsScreen

**File:** `app/profile/achievements.tsx`

**Verify:**

- Tab switcher works
- Achievements tab groups by category
- Challenges tab shows active/available
- Empty states display correctly
- Loading and error states work

---

## Common Issues and Troubleshooting

### Achievement Not Unlocking

**Check:**

1. Achievement criteria is actually met
2. `checkAchievements()` was called after the action
3. Achievement is visible (not hidden)
4. No errors in console

**Debug:**

```javascript
// Check achievement progress manually
const progress = await achievementService.getProgress("achievement-id");
console.log("Progress:", progress);
```

### Streak Not Updating

**Check:**

1. Cooking history entry was created
2. Dates are normalized correctly (midnight)
3. Consecutive days are actually consecutive

**Debug:**

```javascript
// Check streak info
const streakInfo = await streakService.getStreakInfo();
console.log("Streak info:", streakInfo);
```

### Notification Not Showing

**Check:**

1. Notifications are permitted in app settings
2. `scheduleAchievementUnlock()` is called
3. Notification handler is registered

**Debug:**

- Check Expo Notifications documentation
- Verify notification permissions

### Challenge Not Completing

**Check:**

1. Progress is being updated
2. Target value is reached
3. `completeChallenge()` is called

**Debug:**

```javascript
// Check challenge progress
const userChallenges = await database.getUserChallenges();
console.log("User challenges:", userChallenges);
```

---

## Performance Considerations

- Achievement checks run asynchronously and don't block UI
- Database queries use observables for reactive updates
- React Query caches results to minimize database calls

---

## Success Criteria

The achievement system is considered fully functional when:

- ✅ All 4 database tables exist and are accessible
- ✅ All 3 services (Streak, Achievement, Challenge) work correctly
- ✅ Integration points trigger achievement checks
- ✅ UI components display correctly
- ✅ Notifications appear for unlocks
- ✅ Streaks calculate accurately
- ✅ Challenges can be started, progressed, and completed
- ✅ No console errors during normal operation
