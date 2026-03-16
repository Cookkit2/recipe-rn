import * as Notifications from "expo-notifications";
import type { NotificationData, NotificationResponseHandler } from "./notification-types";
import { log } from "~/utils/logger";

// ============================================
// Notification Type Constants
// ============================================

/**
 * Achievement notification type - triggered when an achievement is unlocked
 */
export const ACHIEVEMENT_UNLOCKED_TYPE = "achievement_unlocked" as const;

/**
 * Challenge notification type - triggered when a challenge is completed
 */
export const CHALLENGE_COMPLETED_TYPE = "challenge_completed" as const;

/**
 * Ingredient expiry notification type - triggered when ingredients are expiring soon
 */
export const INGREDIENT_EXPIRY_TYPE = "ingredient_expiry" as const;

// ============================================
// Handler Registry
// ============================================

const handlerRegistry = new Map<string, NotificationResponseHandler>();
let defaultHandler: NotificationResponseHandler | null = null;

/**
 * Register a handler for a specific notification type.
 * When a user taps a notification with `data.type` matching `type`,
 * this handler will be invoked.
 */
export function registerNotificationHandler(
  type: string,
  handler: NotificationResponseHandler
): void {
  handlerRegistry.set(type, handler);
}

/**
 * Remove a registered handler for a specific notification type.
 */
export function unregisterNotificationHandler(type: string): void {
  handlerRegistry.delete(type);
}

/**
 * Register a fallback handler for notifications without a matching type handler.
 */
export function registerDefaultHandler(handler: NotificationResponseHandler): void {
  defaultHandler = handler;
}

/**
 * Dispatch a notification response to the appropriate handler
 * based on `data.type`.
 */
export function dispatchNotificationResponse(response: Notifications.NotificationResponse): void {
  const type = extractNotificationType(response);

  const handler = type && handlerRegistry.has(type) ? handlerRegistry.get(type)! : defaultHandler;

  if (!handler) {
    return;
  }

  void Promise.resolve(handler(response)).catch((error) => {
    // Prevent unhandled promise rejections from async handlers.
    if (typeof console !== "undefined" && typeof console.error === "function") {
      log.error("[notifications] Error in NotificationResponseHandler:", error);
    }
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract the full data payload from a notification response.
 */
export function extractNotificationData(
  response: Notifications.NotificationResponse
): NotificationData | undefined {
  const data = response.notification.request.content.data;
  if (data && typeof data === "object" && "type" in data) {
    return data as NotificationData;
  }
  return undefined;
}

/**
 * Extract the notification type from a response.
 */
export function extractNotificationType(
  response: Notifications.NotificationResponse
): string | undefined {
  return extractNotificationData(response)?.type;
}

/**
 * Extract the screen path from a response.
 */
export function extractScreenPath(
  response: Notifications.NotificationResponse
): string | undefined {
  return extractNotificationData(response)?.screen as string | undefined;
}

/**
 * Check if a handler is registered for a given type.
 */
export function hasHandler(type: string): boolean {
  return handlerRegistry.has(type);
}

/**
 * Get all registered notification types.
 */
export function getRegisteredTypes(): string[] {
  return Array.from(handlerRegistry.keys());
}
