# ADR 002: Notification Handler Registry

## Status

Accepted.

## Context

Local notifications (expo-notifications) need to route user taps to the correct screen or action (e.g. ingredient expiry → pantry, cooking timer → recipe). Handlers must be registered in one place and stay in sync with notification `data.type`.

## Decision

Use a **handler registry** in `lib/notifications/notification-handler.ts`:

- `registerNotificationHandler(type, handler)` and `unregisterNotificationHandler(type)`.
- When a notification is tapped, the system reads `data.type` and invokes the registered handler.
- Handlers are registered in `app/_layout.tsx` (or a child that has router/context) and unregistered on unmount.

Notification types (e.g. `ingredient_expiry`) are documented in `docs/LOCAL_NOTIFICATIONS.md`.

## Consequences

- Adding a new notification type only requires registering a handler and documenting the type.
- Cold start and background tap behavior are centralized in the notification module.
