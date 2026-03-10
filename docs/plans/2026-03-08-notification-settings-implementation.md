# Notification Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a profile-level Notification screen with toggles for key notification categories, persist the settings, and have local notification scheduling respect these preferences.

**Architecture:** Use an MMKV-backed settings object accessed through a small `notificationSettingsService` utility and a `useNotificationSettings` hook, mirror the existing `VoiceSettingsScreen` UX for the new screen, and add lightweight gating in the notification scheduling layer so disabled categories don’t schedule new local notifications.

**Tech Stack:** React Native + Expo Router, MMKV via `storage` facade, existing `lib/notifications` helpers, lucide-uniwind icons, `sonner-native` toasts if needed for error messaging.

---

## Task 1: Storage Key and Settings Service

**Files:**
- Modify: `constants/storage-keys.ts`
- Create: `utils/notification-settings.ts`

**Steps:**
1. Add `NOTIFICATION_SETTINGS_KEY = "notifications:settings"` under the user preferences / settings section.
2. Create `NotificationSettings` interface and defaults (master + three categories) in `notification-settings.ts`.
3. Implement `notificationSettingsService` with:
   - `getSettings()` (safe JSON parse, merge with defaults).
   - `updateSettings(partial)` (merge + persist).
   - `isNotificationDataEnabled(data?: NotificationData)` (map `data.type` string to category and check master + category flags).

## Task 2: Hook for React Components

**Files:**
- Create: `hooks/useNotificationSettings.ts`

**Steps:**
1. Implement stateful hook similar to `useVoiceCookingSettings`:
   - Local `settings` state seeded from `notificationSettingsService.getSettings()`.
   - `updateSettings(partial)` delegating to service and refreshing state.
   - Convenience toggles: `toggleEnabled`, `toggleIngredientExpiry`, `toggleAchievements`, `toggleChallenges`.
2. Integrate permission awareness:
   - Use `getNotificationPermissions` on mount to set `permissionStatus`.
   - When toggling master from off → on, call `requestNotificationPermissions()` and:
     - If granted: set `enabled: true`.
     - If denied: keep `enabled: false` and expose a flag the UI can use to show an inline hint.

## Task 3: Wire Scheduling Gating

**Files:**
- Modify: `lib/notifications/notification-service.ts`
- (Optional defensive guard): `lib/notifications/expiry-notifications/expiry-notifications.ts`

**Steps:**
1. Import `notificationSettingsService` into `notification-service.ts`.
2. In `scheduleNotification`:
   - If master `enabled` is false, short-circuit and return a synthetic identifier without calling `expo-notifications`.
   - If `options.data` is present and `isNotificationDataEnabled` returns false, short-circuit similarly.
3. In `scheduleExpiryNotifications`, early-return if master or `ingredientExpiry` channel is disabled to avoid unnecessary work when expiry alerts are off.

## Task 4: Notification Settings Screen UI

**Files:**
- Create: `app/profile/notification.tsx`

**Steps:**
1. Build a `NotificationScreen` using `ScrollView`, `Card`, `CardContent`, and typography components to match `voice-settings.tsx`.
2. Use `useNotificationSettings` to drive:
   - Master “Enable Notifications” switch (with disabled state and optional inline text if OS permissions are denied).
   - Three category switches for:
     - Ingredient expiry alerts.
     - Achievements & level-ups.
     - Challenges & streaks.
3. Add a small `SettingRow` helper component (local to the screen) mirroring the layout from `voice-settings.tsx` for consistent look and feel.

## Task 5: Navigation and Entry Point

**Files:**
- Modify: `app/profile/index.tsx`
- Modify: `app/_layout.tsx`

**Steps:**
1. In `ProfileScreen`:
   - Import `BellIcon` from `lucide-uniwind`.
   - Add/uncomment a `ListButton` under “General” with `title="Notification"`, `icon={BellIcon}`, and `onPress={() => router.push("/profile/notification")}`.
2. In `_layout.tsx`:
   - Add a `Stack.Screen` for `name="profile/notification"` with header options matching other profile sub-screens (large title “Notification”, same font + color, minimal back button).

## Task 6: Verification

**Files:**
- (No new files; run app and exercise flows)

**Steps:**
1. Run the app on a device/simulator with notifications enabled.
2. Manually verify:
   - Profile → “Notification” opens the new screen and switches persist across reloads.
   - Turning the master toggle off prevents new local notifications like ingredient expiry alerts and achievements from firing (e.g., by simulating or fast-forwarding flows that previously scheduled them).
   - With system notifications disabled at OS level, the screen surfaces an explanatory hint while still allowing users to manage app-level preferences.
3. Check for TypeScript and linter errors and fix any introduced issues.

