# ADR 0002: Notification Handler Registry

## Status

Accepted

## Context

The DoneDish application relies heavily on local notifications (via `expo-notifications`) for features such as ingredient expiry reminders, cooking timers, and daily meal planning prompts. As the number of notification types grew, the logic for handling a user's tap on a notification became centralized, bloated, and difficult to manage. A single, monolithic `useEffect` block in the app root attempted to parse every incoming notification response.

## Decision

We will implement a **Handler Registry Pattern** for managing notification responses.

1. **Type-Based Routing**: Every scheduled notification will include a custom `data.type` field (e.g., `ingredient_expiry`, `cooking_timer`).
2. **Modular Registration**: Components or features will register their own handlers using `registerNotificationHandler(type, callback)`.
3. **Provider Integration**: A single `NotificationProvider` at the app root will listen for notification responses and dispatch them to the appropriate registered handler based on `data.type`.

## Consequences

### Positive
- **Separation of Concerns**: Notification handling logic is decentralized. A feature (like cooking timers) can register its own handler, keeping the logic close to the feature.
- **Maintainability**: Adding a new notification type simply requires registering a new handler, without modifying a central parsing function.
- **Cold-Start Handling**: The `NotificationProvider` automatically caches the last response for app cold-starts and defers execution until navigation is ready, simplifying edge-case handling.

### Negative
- **Memory Leaks**: Developers must remember to call `unregisterNotificationHandler` when unmounting components to avoid memory leaks or stale closures.
- **Debugging**: Tracing the execution flow of a notification tap involves tracking down where the specific handler for that `type` was registered, rather than looking at a single function.
