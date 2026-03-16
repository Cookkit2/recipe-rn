# Local Notifications System

> A comprehensive, type-safe local notification system built on `expo-notifications` with a handler registry pattern for flexible notification routing.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Notification Service](#notification-service)
  - [Notification Handler](#notification-handler)
  - [Notification Provider](#notification-provider)
  - [Expiry Notifications](#expiry-notifications)
- [Usage Examples](#usage-examples)
- [App State Behavior](#app-state-behavior)
- [Configuration Constants](#configuration-constants)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The notification system provides a generic, extensible interface for scheduling and handling local notifications in the DoneDish (formerly Cookkit) app. It supports:

- **Type-based routing**: Notifications are routed to specific handlers based on their `data.type` field
- **Multiple trigger types**: Time interval, specific date, daily, and weekly schedules
- **App state awareness**: Handles notifications differently based on foreground, background, and terminated states
- **Ingredient expiry notifications**: Built-in support for scheduling ingredient expiry reminders with intelligent batching

## Architecture

```
lib/notifications/
├── index.ts                    # Public API exports
├── notification-types.ts       # TypeScript interfaces
├── notification-service.ts     # Core scheduling functions
├── notification-handler.ts     # Handler registry pattern
├── NotificationProvider.tsx    # React context & listeners
└── expiry-notifications/
    └── expiry-notifications.ts # Ingredient-specific logic

constants/
└── notifications.ts            # Configuration constants
```

### Design Patterns

1. **Handler Registry Pattern**: Handlers are registered by notification type, allowing modular handling logic
2. **Provider Pattern**: `NotificationProvider` wraps the app to initialize listeners and manage state
3. **Facade Pattern**: The module exports a clean API, hiding expo-notifications complexity
4. **Batch Grouping**: Expiry notifications are intelligently batched to prevent notification spam

---

## Installation & Setup

### 1. Install Dependencies

The package is already installed:

```bash
npx expo install expo-notifications
```

Ensure `expo-notifications` is in the `plugins` array in [app.json](../app.json):

```json
{
  "expo": {
    "plugins": [
      // ... other plugins
      "expo-notifications"
    ]
  }
}
```

### 2. Rebuild Native Code

After adding the plugin, rebuild the native apps:

```bash
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

### 3. Wrap Your App with NotificationProvider

The `NotificationProvider` is already integrated in [app/_layout.tsx](../app/_layout.tsx):

```tsx
import { NotificationProvider } from "~/lib/notifications";

export default function RootLayout() {
  return (
    <NotificationProvider>
      <KeyboardProvider>
        {/* Rest of your app */}
      </KeyboardProvider>
    </NotificationProvider>
  );
}
```

### 4. Register Notification Handlers

Handlers are registered in [app/_layout.tsx](../app/_layout.tsx):

```tsx
import { registerNotificationHandler, unregisterNotificationHandler } from "~/lib/notifications";
import { useRouter } from "expo-router";

function AnimatedStack() {
  const router = useRouter();

  useEffect(() => {
    // Register handler for ingredient expiry notifications
    registerNotificationHandler("ingredient_expiry", () => {
      router.push("/"); // Navigate to pantry
    });

    return () => {
      unregisterNotificationHandler("ingredient_expiry");
    };
  }, [router]);

  return <Stack />;
}
```

---

## Core Concepts

### Notification Data Structure

Every notification can include a `data` payload used for routing and navigation:

```typescript
interface NotificationData {
  type: string;      // Required for handler routing
  screen?: string;   // Optional: screen path for navigation
  [key: string]: unknown; // Additional custom data
}
```

### Trigger Types

| Trigger Type | Description | Example |
|--------------|-------------|---------|
| `TimeIntervalTrigger` | Fire after X seconds | `{ seconds: 60, repeats: false }` |
| `DateTrigger` | Fire at specific date/time | `{ date: new Date('2025-01-15') }` |
| `DailyTrigger` | Fire daily at specific time | `{ hour: 9, minute: 0, repeats: true }` |
| `WeeklyTrigger` | Fire weekly on specific day | `{ weekday: 1, hour: 9, minute: 0, repeats: true }` |

### Handler Registry

Handlers are functions that execute when a user taps a notification:

```typescript
type NotificationResponseHandler = (
  response: Notifications.NotificationResponse
) => void | Promise<void>;
```

---

## API Reference

### Notification Service

Core functions for scheduling and managing notifications.

#### `initializeNotifications()`

Initialize notification settings. On Android 8+, creates a default notification channel.

```typescript
import { initializeNotifications } from "~/lib/notifications";

await initializeNotifications();
```

**Note**: This is automatically called by `NotificationProvider`, so you typically don't need to call it manually.

#### `scheduleNotification(options)`

Schedule a local notification.

```typescript
import { scheduleNotification } from "~/lib/notifications";

const notificationId = await scheduleNotification({
  id: "reminder-123",        // Optional: custom ID for cancellation
  title: "Reminder",
  body: "Don't forget to check your pantry!",
  subtitle: "DoneDish",      // iOS only
  data: {
    type: "reminder",
    screen: "/pantry",
  },
  trigger: { seconds: 3600 }, // Fire in 1 hour
  sound: true,               // Default: true
  badge: 1,                  // iOS badge count
});
```

#### `cancelNotification(id)`

Cancel a scheduled notification by its identifier.

```typescript
import { cancelNotification } from "~/lib/notifications";

await cancelNotification("reminder-123");
```

#### `cancelAllNotifications()`

Cancel all scheduled notifications.

```typescript
import { cancelAllNotifications } from "~/lib/notifications";

await cancelAllNotifications();
```

#### `getScheduledNotifications()`

Get all currently scheduled notifications.

```typescript
import { getScheduledNotifications } from "~/lib/notifications";

const scheduled = await getScheduledNotifications();
// Returns: ScheduledNotification[]
```

#### `requestNotificationPermissions()`

Request notification permissions from the user.

```typescript
import { requestNotificationPermissions } from "~/lib/notifications";

const { granted, status } = await requestNotificationPermissions();
// status: "granted" | "denied" | "undetermined"
```

#### `getNotificationPermissions()`

Get current notification permissions without prompting.

```typescript
import { getNotificationPermissions } from "~/lib/notifications";

const { granted, status } = await getNotificationPermissions();
```

#### Badge Management (iOS)

```typescript
import { getBadgeCount, setBadgeCount } from "~/lib/notifications";

const count = await getBadgeCount();
await setBadgeCount(5);
```

#### Dismiss Notifications

Dismiss notifications from the notification tray (doesn't cancel scheduled ones).

```typescript
import { dismissNotification, dismissAllNotifications } from "~/lib/notifications";

await dismissNotification("notification-id");
await dismissAllNotifications();
```

---

### Notification Handler

Functions for registering and managing notification handlers.

#### `registerNotificationHandler(type, handler)`

Register a handler for a specific notification type.

```typescript
import { registerNotificationHandler } from "~/lib/notifications";

registerNotificationHandler("ingredient_expiry", (response) => {
  const data = response.notification.request.content.data;
  console.log("Ingredient IDs:", data.ingredientIds);
  // Navigate or perform action
});
```

#### `unregisterNotificationHandler(type)`

Remove a registered handler.

```typescript
import { unregisterNotificationHandler } from "~/lib/notifications";

unregisterNotificationHandler("ingredient_expiry");
```

#### `registerDefaultHandler(handler)`

Register a fallback handler for notifications without a specific type handler.

```typescript
import { registerDefaultHandler } from "~/lib/notifications";

registerDefaultHandler((response) => {
  console.log("Unhandled notification:", response);
});
```

#### Helper Functions

```typescript
import {
  extractNotificationData,
  extractNotificationType,
  extractScreenPath,
  hasHandler,
  getRegisteredTypes,
} from "~/lib/notifications";

// Extract data from a response
const data = extractNotificationData(response);
const type = extractNotificationType(response);
const screen = extractScreenPath(response);

// Check registry
const hasExpiryHandler = hasHandler("ingredient_expiry");
const allTypes = getRegisteredTypes();
```

---

### Notification Provider

React components and hooks for notification management.

#### `NotificationProvider`

Wrap your app to initialize notification listeners.

```tsx
import { NotificationProvider } from "~/lib/notifications";

<NotificationProvider
  onForegroundNotification={(notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  })}
>
  {children}
</NotificationProvider>
```

#### `useNotificationContext()`

Access notification context state.

```tsx
import { useNotificationContext } from "~/lib/notifications";

function MyComponent() {
  const { isInitialized } = useNotificationContext();
  // ...
}
```

#### `useLastNotificationResponse()`

Hook to access the last notification response (useful for cold-start handling).

```tsx
import { useLastNotificationResponse } from "~/lib/notifications";

function MyComponent() {
  const lastResponse = useLastNotificationResponse();

  useEffect(() => {
    if (lastResponse) {
      // Handle the notification that launched the app
    }
  }, [lastResponse]);
}
```

---

### Expiry Notifications

Specialized functions for ingredient expiry notifications.

#### `scheduleExpiryNotifications(items)`

Schedule expiry notifications for a batch of ingredients.

```typescript
import { scheduleExpiryNotifications, ExpiryItem } from "~/lib/notifications";

const items: ExpiryItem[] = [
  { id: "1", name: "Milk", expiry_date: new Date("2025-01-15") },
  { id: "2", name: "Eggs", expiry_date: new Date("2025-01-16") },
];

await scheduleExpiryNotifications(items);
```

**Features:**
- Automatically skips items without `expiry_date`
- Skips items where notification time is already in the past
- Groups items expiring within 6 hours to prevent notification spam
- Sends notifications 1 day before expiry at 9 AM UTC
- Uses `ingredient_expiry` type for handler routing
- Automatically formats body text based on item count

#### `cancelExpiryNotification(ingredientId)`

Cancel an expiry notification for a specific ingredient.

```typescript
import { cancelExpiryNotification } from "~/lib/notifications";

await cancelExpiryNotification("ingredient-123");
```

#### `rescheduleExpiryNotification(item)`

Cancel an existing expiry notification and schedule a new one. Useful when an ingredient's expiry date is updated.

```typescript
import { rescheduleExpiryNotification } from "~/lib/notifications";

await rescheduleExpiryNotification({
  id: "ingredient-123",
  name: "Milk",
  expiry_date: new Date("2025-01-20"),
});
```

---

## Usage Examples

### Example 1: Integration with Pantry Save Flow

See [app/ingredient/(create)/confirmation.tsx](../app/ingredient/(create)/confirmation.tsx):

```tsx
const onSaveAllIngredients = useCallback(async () => {
  try {
    setIsSavingIngredients(true);
    await presentPaywallIfNeeded();

    // Save items and get DB-assigned IDs
    const savedItems = await addPantryItemsWithMetadata.mutateAsync(completedItems);

    // Schedule expiry notifications for saved items
    try {
      const { granted } = await getNotificationPermissions();
      if (!granted) {
        await requestNotificationPermissions();
      }
      await scheduleExpiryNotifications(savedItems);
    } catch {
      // Non-critical: don't block save flow if notifications fail
    }

    queryClient.invalidateQueries({
      queryKey: recipeQueryKeys.recommendations(),
    });
    router.dismissTo("/");
  } catch {
    toast.error("Error saving ingredients");
  } finally {
    setIsSavingIngredients(false);
  }
}, [completedItems]);
```

**Key implementation details:**
- Captures `savedItems` (with DB-assigned IDs) instead of `completedItems` (client-side temp IDs)
- Requests permissions before first schedule
- Wraps notification scheduling in try/catch to avoid blocking critical save flow

### Example 2: Integration with Delete Flow

See [hooks/queries/usePantryQueries.ts](../hooks/queries/usePantryQueries.ts):

```tsx
export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.deletePantryItem,
    onSuccess: async (_, deletedId) => {
      // Cancel any scheduled expiry notification for this item
      try {
        await cancelExpiryNotification(deletedId);
      } catch {
        // Non-critical
      }

      // Remove the item from cache
      queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((item) => item.id !== deletedId);
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.expiring(),
      });
      // ...
    },
  });
}
```

### Example 3: Integration with Update Flow

See [hooks/queries/usePantryQueries.ts](../hooks/queries/usePantryQueries.ts):

```tsx
export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PantryItem> }) =>
      pantryApi.updatePantryItem(id, updates),
    onSuccess: async (updatedItem) => {
      // Reschedule expiry notification if item has an expiry date
      try {
        await rescheduleExpiryNotification(updatedItem);
      } catch {
        // Non-critical
      }

      // Update the specific item in cache
      queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      });
      // ...
    },
  });
}
```

**Important**: This automatically handles expiry date changes. When a user edits an ingredient's expiry date via [DateSection.tsx](../components/Ingredient/DateSection.tsx), the notification is rescheduled.

### Example 4: Schedule a One-Time Reminder

```typescript
import { scheduleNotification } from "~/lib/notifications";

await scheduleNotification({
  title: "Recipe Ready!",
  body: "Your dish should be done cooking now.",
  trigger: { seconds: 1800 }, // 30 minutes
  data: {
    type: "cooking_timer",
    screen: "/recipes/active",
  },
});
```

### Example 5: Schedule a Daily Reminder

```typescript
import { scheduleNotification } from "~/lib/notifications";

await scheduleNotification({
  id: "daily-meal-plan",
  title: "Plan Your Meals",
  body: "What's for dinner tonight?",
  trigger: {
    hour: 17,  // 5 PM
    minute: 0,
    repeats: true,
  },
  data: {
    type: "meal_planning",
    screen: "/recipes",
  },
});
```

### Example 6: Register Multiple Handlers

```tsx
// app/_layout.tsx
useEffect(() => {
  registerNotificationHandler("ingredient_expiry", () => {
    router.push("/");
  });

  registerNotificationHandler("cooking_timer", () => {
    router.push("/recipes/active");
  });

  registerNotificationHandler("meal_planning", () => {
    router.push("/recipes");
  });

  // Cleanup on unmount
  return () => {
    unregisterNotificationHandler("ingredient_expiry");
    unregisterNotificationHandler("cooking_timer");
    unregisterNotificationHandler("meal_planning");
  };
}, [router]);
```

---

## App State Behavior

The notification system handles three app states:

| State | Behavior |
|-------|----------|
| **Foreground** | Notification appears as banner (configurable via `onForegroundNotification` prop) |
| **Background** | System shows notification; tap triggers registered handler |
| **Terminated (Cold Start)** | App launches, `NotificationProvider` checks for last response and routes to handler |

### Cold Start Handling

The `NotificationProvider` automatically handles cold-start scenarios in [NotificationProvider.tsx](../lib/notifications/NotificationProvider.tsx):

1. Checks if app was launched from a notification tap
2. Waits 500ms for navigation to be ready
3. Routes to the appropriate handler based on `data.type`
4. Clears the last response to prevent re-handling

---

## User notification settings

Users can enable or disable notification categories (e.g. ingredient expiry) from the app. Settings are stored via the same key-value layer used elsewhere; the notification system reads them before scheduling.

- **Storage**: Settings are read via `notificationSettingsService.getSettings()` (see [utils/notification-settings.ts](../utils/notification-settings.ts)). The storage key and shape are defined there.
- **Effect on scheduling**: `scheduleExpiryNotifications` (and similar flows) call `getSettings()` at the start; if the user has disabled notifications or ingredient expiry, scheduling is skipped.
- **UI**: The notification preferences screen is [app/profile/notification.tsx](../app/profile/notification.tsx). The hook [hooks/useNotificationSettings.ts](../hooks/useNotificationSettings.ts) is used to read and update these settings.

---

## Configuration Constants

Expiry notification constants are defined in [constants/notifications.ts](../constants/notifications.ts):

```typescript
// How many days before expiry to send notification
export const EXPIRY_NOTIFICATION_DAYS_BEFORE = 1;

// Time window for batching notifications (6 hours)
export const EXPIRY_NOTIFICATION_BATCH_WINDOW_MS = 6 * 60 * 60 * 1000;

// Hour to send notification in UTC (9 AM UTC)
// 9 AM UTC = 4 AM EST / 1 AM PST / 5 PM JST
export const EXPIRY_NOTIFICATION_HOUR_UTC = 9;

// Notification content
export const EXPIRY_NOTIFICATION_TITLE = "Ingredients Expiring Soon";

export const EXPIRY_NOTIFICATION_BODY_SINGLE = (name: string): string =>
  `Your ${name} is expiring soon! Use it before it goes bad.`;

export const EXPIRY_NOTIFICATION_BODY_MULTIPLE = (count: number): string =>
  `${count} ingredients are expiring soon. Check your pantry!`;
```

---

## Best Practices

### 1. Always Use Custom IDs for Cancellable Notifications

```typescript
// Good: Can be cancelled later
await scheduleNotification({
  id: `expiry-${ingredientId}`,
  // ...
});

// Bad: ID is auto-generated, hard to cancel specific notification
await scheduleNotification({
  // no id
  // ...
});
```

### 2. Clean Up Handlers on Unmount

```tsx
useEffect(() => {
  registerNotificationHandler("my_type", handler);
  return () => unregisterNotificationHandler("my_type");
}, []);
```

### 3. Check Permissions Before Scheduling

```typescript
const { granted } = await getNotificationPermissions();
if (!granted) {
  await requestNotificationPermissions();
}
await scheduleNotification({ ... });
```

### 4. Use TypeScript for Type Safety

The entire notification system is fully typed. Import types as needed:

```typescript
import type {
  ScheduleNotificationOptions,
  NotificationData,
  NotificationTrigger,
  ExpiryItem,
} from "~/lib/notifications";
```

### 5. Wrap Non-Critical Notification Operations in Try/Catch

Don't let notification failures block critical user flows:

```typescript
try {
  await scheduleExpiryNotifications(savedItems);
} catch {
  // Non-critical: continue with the main flow
}
```

This pattern is used in:
- [confirmation.tsx](../app/ingredient/(create)/confirmation.tsx) — save flow
- [usePantryQueries.ts](../hooks/queries/usePantryQueries.ts) — delete/update flows

### 6. Use DB-Assigned IDs for Notifications

Always use IDs from the database, not client-side temporary IDs:

```typescript
// ✅ Good: Use returned items with DB-assigned IDs
const savedItems = await addPantryItemsWithMetadata.mutateAsync(completedItems);
await scheduleExpiryNotifications(savedItems);

// ❌ Bad: Use completedItems with client-side temp IDs
await addPantryItemsWithMetadata.mutateAsync(completedItems);
await scheduleExpiryNotifications(completedItems); // Wrong IDs!
```

---

## Troubleshooting

### Notifications Not Appearing

1. **Check permissions**: Call `getNotificationPermissions()` to verify status
2. **Android channel**: Ensure `initializeNotifications()` is called (done automatically by `NotificationProvider`)
3. **Trigger timing**: Verify the trigger time is in the future
4. **Native rebuild**: After installing `expo-notifications`, run `npx expo prebuild --clean`

### Handler Not Executing

1. **Type mismatch**: Ensure `data.type` in the notification matches the registered handler type
2. **Provider missing**: Confirm `NotificationProvider` wraps your app in [app/_layout.tsx](../app/_layout.tsx)
3. **Handler registration timing**: Register handlers before notifications might be received
4. **Cleanup**: Ensure handlers are unregistered on unmount to prevent memory leaks

### Cold Start Issues

1. **Delay navigation**: The system waits 500ms; ensure navigation is ready by then
2. **Clear last response**: The system clears after handling; don't clear manually

### iOS Badge Not Updating

```typescript
// Explicitly set badge count
await setBadgeCount(0); // Clear badge
await setBadgeCount(5); // Set to 5
```

### TypeScript Errors in Expiry Notifications

If you see "possibly undefined" errors, ensure you're using the proper type guards:

```typescript
// Filter to items with expiry dates
const itemsWithExpiry = items.filter(
  (item): item is ExpiryItem & { expiry_date: Date } => item.expiry_date != null
);
```

### Permission Denied on First Save

The permission request happens before the first save. If denied, notifications won't schedule but the save will continue. To prompt again, the user must:
- iOS: Go to Settings → DoneDish → Notifications
- Android: Go to Settings → Apps → DoneDish → Notifications

---

## Type Definitions

### Full Type Reference

```typescript
// Trigger types
interface TimeIntervalTrigger {
  seconds: number;
  repeats?: boolean;
}

interface DateTrigger {
  date: Date;
}

interface DailyTrigger {
  hour: number;
  minute: number;
  repeats: true;
}

interface WeeklyTrigger {
  weekday: number; // 1-7, Sunday = 1
  hour: number;
  minute: number;
  repeats: true;
}

type NotificationTrigger =
  | TimeIntervalTrigger
  | DateTrigger
  | DailyTrigger
  | WeeklyTrigger;

// Scheduling options
interface ScheduleNotificationOptions {
  id?: string;
  title: string;
  body: string;
  subtitle?: string;
  data?: NotificationData;
  trigger: NotificationTrigger;
  sound?: boolean;
  badge?: number;
}

// Permission result
interface NotificationPermissionResult {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
}

// Foreground behavior
interface ForegroundNotificationBehavior {
  shouldShowBanner: boolean;
  shouldShowList: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

// Expiry item
interface ExpiryItem {
  id: string;
  name: string;
  expiry_date?: Date;
}
```

---

## Implementation Details

### Files Created

| File | Purpose |
|------|---------|
| [lib/notifications/index.ts](../lib/notifications/index.ts) | Public API exports |
| [lib/notifications/notification-types.ts](../lib/notifications/notification-types.ts) | TypeScript interfaces |
| [lib/notifications/notification-service.ts](../lib/notifications/notification-service.ts) | Core scheduling functions |
| [lib/notifications/notification-handler.ts](../lib/notifications/notification-handler.ts) | Handler registry |
| [lib/notifications/NotificationProvider.tsx](../lib/notifications/NotificationProvider.tsx) | React context |
| [lib/notifications/expiry-notifications/expiry-notifications.ts](../lib/notifications/expiry-notifications/expiry-notifications.ts) | Ingredient expiry logic |
| [constants/notifications.ts](../constants/notifications.ts) | Configuration constants |

### Files Modified

| File | Changes |
|------|---------|
| [app.json](../app.json) | Added `expo-notifications` plugin |
| [app/_layout.tsx](../app/_layout.tsx) | Wrapped with `NotificationProvider`, registered `ingredient_expiry` handler |
| [app/ingredient/(create)/confirmation.tsx](../app/ingredient/(create)/confirmation.tsx) | Schedule notifications on save with permission request |
| [hooks/queries/usePantryQueries.ts](../hooks/queries/usePantryQueries.ts) | Cancel on delete, reschedule on update |

### Key Improvements Over Original Plan

1. **Correct ID usage**: Uses DB-assigned IDs from mutation return values
2. **Handler cleanup**: Properly unregisters handlers on unmount
3. **Update flow**: Added `rescheduleExpiryNotification` for expiry date edits
4. **Error handling**: All notification operations wrapped in try/catch
5. **Permission flow**: Requests permissions before first schedule
6. **Type safety**: Fixed TypeScript errors with proper type guards and non-null assertions
7. **Non-blocking**: Notification failures don't block critical user flows

---

## Future Enhancements

Potential improvements for future iterations:

1. **Notification Reconciliation**: On app startup, reconcile scheduled notifications with current pantry state
2. **User Preferences**: Allow users to configure notification timing and batching
3. **Rich Notifications**: Add images or action buttons to notifications
4. **Notification History**: Track which notifications were sent and user interactions
5. **Testing**: Add unit tests for batch grouping logic and handler dispatch
6. **Background Sync**: Schedule notifications when pantry is updated via background sync
7. **Multiple Reminder Times**: Allow users to set multiple reminder times before expiry

---

## Related Documentation

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Push Notifications Guide](https://reactnative.dev/docs/pushnotificationios)
- [App Store Guidelines - Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [Android Notification Best Practices](https://developer.android.com/develop/ui/views/notifications)

---

## Support

For issues or questions about the notification system:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [best practices](#best-practices)
3. Examine the implementation in the files listed above
4. Refer to the [Expo Notifications API documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
