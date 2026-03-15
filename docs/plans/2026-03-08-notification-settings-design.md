# Notification Settings Screen – Design

## Background and Motivation

Users can currently receive several kinds of local notifications (ingredient expiry reminders, achievements, challenges, streak reminders) but there is no central place in the app UI to control which categories they want. We want a simple profile-level screen where users can enable/disable high-level notification categories without digging into system settings, and have those preferences respected by our local notification scheduling logic.

---

## Scope

- **In scope**:
  - New “Notification” screen under Profile.
  - App-level master toggle for DoneDish notifications.
  - Per-category toggles for:
    - Ingredient expiry reminders.
    - Achievements & level-ups.
    - Challenges & streak reminders.
  - Persisting preferences via existing `storage` (MMKV) with a single structured settings object.
  - Using these settings to gate scheduling of local notifications where reasonable.
- **Out of scope (for now)**:
  - Fine-grained per-notification-type controls (e.g. separate toggles for daily vs weekly challenges).
  - Remote push delivery control at the OS level (user still uses system settings for that).
  - Time-of-day customization for reminders.

---

## UX and Navigation

- **Entry point**: `Profile` → General section → `Notification` list item with a bell icon.
- **Route**: `app/profile/notification.tsx` with Expo Router path `/profile/notification`.
- **Header**: Matches other profile sub-screens (`Analytics`, `Achievements`, `Preferences`) via a `Stack.Screen name="profile/notification"` entry in `app/_layout.tsx`.
- **Layout**:
  - Single scrollable screen using cards similar to `VoiceSettingsScreen`.
  - First card: “Push Notifications” with a master “Enable Notifications” switch and OS-permission status hint text if permissions are denied.
  - Second card (visible when master is enabled): three `SettingRow` rows with switches for:
    - “Ingredient expiry alerts” – “Get reminders before ingredients go bad.”
    - “Achievements & level-ups” – “Celebrate milestones and XP gains.”
    - “Challenges & streaks” – “Daily/weekly challenges and streak reminders.”

---

## Data Model and Storage

- Add a single key to `constants/storage-keys.ts`:
  - `NOTIFICATION_SETTINGS_KEY = "notifications:settings"`.
- New `NotificationSettings` shape stored as JSON under that key:

```ts
interface NotificationSettings {
  enabled: boolean;
  ingredientExpiry: boolean;
  achievements: boolean;
  challenges: boolean;
}
```

- Default values:
  - `enabled: true`
  - `ingredientExpiry: true`
  - `achievements: true`
  - `challenges: true`

- New utility in `utils/notification-settings.ts`:
  - `getSettings()` – read + merge with defaults, with safe JSON parsing.
  - `updateSettings(partial)` – persist merged settings to `storage`.
  - `isNotificationDataEnabled(data?: NotificationData)` – map `data.type` to a coarse category and return whether that category is allowed, factoring in the master `enabled` flag.
  - Mapping rules (string-based to avoid circular deps):
    - `ingredient_expiry` → `ingredientExpiry`
    - `achievement_unlock`, `level_up`, `streak_milestone` → `achievements`
    - `challenge_complete`, `daily_challenge_available`, `weekly_challenge_available`, `streak_reminder`, `challenge_expiry_reminder` → `challenges`
    - Unknown types → allowed by default.

---

## Integration with Notification System

- `hooks/useNotificationSettings.ts`:
  - React hook wrapping `notificationSettingsService` similar to `useVoiceCookingSettings`.
  - Exposes `{ settings, updateSettings, toggleEnabled, toggleIngredientExpiry, toggleAchievements, toggleChallenges, permissionStatus, refreshPermissions }`.
  - Uses `getNotificationPermissions` / `requestNotificationPermissions` from `~/lib/notifications`:
    - On mount: read current OS permission into `permissionStatus`.
    - When toggling master from off → on: request permissions; if denied, keep `enabled` false and surface a short inline message.

- `lib/notifications/notification-service.ts`:
  - In `scheduleNotification`, before building the trigger:
    - Read `options.data` as `NotificationData | undefined`.
    - If settings `enabled` is false, short-circuit and skip scheduling.
    - If `options.data` maps to a disabled category via `isNotificationDataEnabled`, skip scheduling.
  - When skipping, simply return a synthetic identifier (e.g. the passed `id` or a generated string) but perform no `expo-notifications` call, so callers don’t crash but the user doesn’t see the notification.

- `lib/notifications/expiry-notifications/expiry-notifications.ts`:
  - Optionally, early-return from `scheduleExpiryNotifications` if notifications are globally disabled or `ingredientExpiry` is false (defensive gate in addition to `scheduleNotification`).

---

## Screen Implementation Details

- New `NotificationScreen` component in `app/profile/notification.tsx`:
  - Uses `ScrollView` + `Card`/`CardContent` from `~/components/ui/card`.
  - Reuses a local `SettingRow` component pattern similar to `voice-settings.tsx` for switch rows.
  - Uses `Switch` from `react-native` for now to match existing voice settings UI.
  - Shows a small muted text line when OS permissions are denied:
    - Example: “System notifications are disabled for DoneDish. Enable them in Settings to receive alerts.”

- `app/profile/index.tsx`:
  - Import `BellIcon` from `lucide-uniwind`.
  - Uncomment/add the `ListButton`:
    - `title="Notification"`
    - `icon={BellIcon}`
    - `onPress={() => router.push("/profile/notification")}`

- `app/_layout.tsx`:
  - Add a `Stack.Screen` entry:

```tsx
<Stack.Screen
  name="profile/notification"
  options={{
    presentation: "card",
    headerShown: true,
    headerTransparent: true,
    headerTitle: "Notification",
    headerLargeTitleEnabled: true,
    headerLargeTitleStyle: {
      /* match other profile screens */
    },
    headerTitleStyle: {
      /* match other profile screens */
    },
    headerTintColor: colors.foreground,
    headerBackButtonDisplayMode: "minimal",
  }}
/>
```

---

## Edge Cases and Behavior Notes

- If the user disables notifications inside iOS/Android system settings:
  - The app-level master toggle can still be “on”, but `permissionStatus` will be “denied/undetermined”.
  - We will surface a non-blocking hint, but not attempt to force or open system settings automatically.

- If the master toggle is off:
  - All category switches are visually disabled/greyed out (the screen will still show their last values but treat them as inactive).
  - `scheduleNotification` will skip any scheduling calls regardless of category.

- This design intentionally keeps the model coarse-grained; we can later extend `NotificationSettings` to include more specific channels without breaking the initial UI.
