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

The notification system provides a generic, extensible interface for scheduling and handling local notifications in the Cookkit app. It supports:

- **Type-based routing**: Notifications are routed to specific handlers based on their `data.type` field
- **Multiple trigger types**: Time interval, specific date, daily, and weekly schedules
- **App state awareness**: Handles notifications differently based on foreground, background, and terminated states
- **Ingredient expiry notifications**: Built-in support for scheduling ingredient expiry reminders

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
```

### Design Patterns

1. **Handler Registry Pattern**: Handlers are registered by notification type, allowing modular handling logic
2. **Provider Pattern**: `NotificationProvider` wraps the app to initialize listeners and manage state
3. **Facade Pattern**: The module exports a clean API, hiding expo-notifications complexity

---

## Installation & Setup

### 1. Wrap Your App with NotificationProvider

The `NotificationProvider` must wrap your app to initialize notification listeners:

```tsx
// app/_layout.tsx
import { NotificationProvider } from "~/lib/notifications";

export default function RootLayout() {
  return (
    <NotificationProvider>
      {/* Other providers */}
      <Stack />
    </NotificationProvider>
  );
}
```

### 2. Register Notification Handlers

Register handlers for specific notification types in your app's initialization:

```tsx
// app/_layout.tsx
import { registerNotificationHandler } from "~/lib/notifications";
import { useRouter } from "expo-router";

function AnimatedStack() {
  const router = useRouter();

  useEffect(() => {
    // Register handler for ingredient expiry notifications
    registerNotificationHandler("ingredient_expiry", () => {
      router.push("/"); // Navigate to pantry
    });
  }, [router]);

  return <Stack />;
}
```

### 3. Request Permissions

Request notification permissions before scheduling notifications:

```tsx
import { requestNotificationPermissions } from "~/lib/notifications";

async function requestPermissions() {
  const { granted, status } = await requestNotificationPermissions();
  
  if (!granted) {
    // Handle denied permissions
    console.log("Notification permission status:", status);
  }
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

#### `scheduleNotification(options)`

Schedule a local notification.

```typescript
import { scheduleNotification } from "~/lib/notifications";

const notificationId = await scheduleNotification({
  id: "reminder-123",        // Optional: custom ID for cancellation
  title: "Reminder",
  body: "Don't forget to check your pantry!",
  subtitle: "Cookkit",       // iOS only
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

---

## Usage Examples

### Example 1: Schedule a One-Time Reminder

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

### Example 2: Schedule a Daily Reminder

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

### Example 3: Register Multiple Handlers

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

### Example 4: Integration with Pantry Items

```tsx
// hooks/queries/usePantryQueries.ts
export function useDeletePantryItem() {
  return useMutation({
    mutationFn: pantryApi.deletePantryItem,
    onSuccess: async (_, deletedId) => {
      // Cancel any scheduled expiry notification for this item
      await cancelExpiryNotification(deletedId);
      
      // Invalidate queries...
    },
  });
}
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

The `NotificationProvider` automatically handles cold-start scenarios:

1. Checks if app was launched from a notification tap
2. Waits 500ms for navigation to be ready
3. Routes to the appropriate handler based on `data.type`
4. Clears the last response to prevent re-handling

---

## Configuration Constants

Expiry notification constants are defined in `constants/notifications.ts`:

```typescript
// How many days before expiry to send notification
export const EXPIRY_NOTIFICATION_DAYS_BEFORE = 1;

// Time window for batching notifications (6 hours)
export const EXPIRY_NOTIFICATION_BATCH_WINDOW_MS = 6 * 60 * 60 * 1000;

// Hour to send notification in UTC (9 AM UTC)
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
if (granted) {
  await scheduleNotification({ ... });
}
```

### 4. Use TypeScript for Type Safety

The entire notification system is fully typed. Import types as needed:

```typescript
import type {
  ScheduleNotificationOptions,
  NotificationData,
  NotificationTrigger,
} from "~/lib/notifications";
```

### 5. Batch Related Notifications

The expiry notification system demonstrates batching. Apply similar patterns to prevent notification spam.

---

## Troubleshooting

### Notifications Not Appearing

1. **Check permissions**: Call `getNotificationPermissions()` to verify status
2. **Android channel**: Ensure `initializeNotifications()` is called (done automatically by `NotificationProvider`)
3. **Trigger timing**: Verify the trigger time is in the future

### Handler Not Executing

1. **Type mismatch**: Ensure `data.type` in the notification matches the registered handler type
2. **Provider missing**: Confirm `NotificationProvider` wraps your app
3. **Handler registration timing**: Register handlers before notifications might be received

### Cold Start Issues

1. **Delay navigation**: The system waits 500ms; ensure navigation is ready by then
2. **Clear last response**: The system clears after handling; don't clear manually

### iOS Badge Not Updating

```typescript
// Explicitly set badge count
await setBadgeCount(0); // Clear badge
await setBadgeCount(5); // Set to 5
```

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

## Related Files

| File | Purpose |
|------|---------|
| `lib/notifications/index.ts` | Public API exports |
| `lib/notifications/notification-types.ts` | TypeScript interfaces |
| `lib/notifications/notification-service.ts` | Core scheduling functions |
| `lib/notifications/notification-handler.ts` | Handler registry |
| `lib/notifications/NotificationProvider.tsx` | React context |
| `lib/notifications/expiry-notifications/` | Ingredient expiry logic |
| `constants/notifications.ts` | Configuration constants |
| `app/_layout.tsx` | Provider integration |
| `hooks/queries/usePantryQueries.ts` | Usage example (cancel on delete) |
| `app/ingredient/(create)/confirmation.tsx` | Usage example (schedule on save) |
