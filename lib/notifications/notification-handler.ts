import type * as Notifications from "expo-notifications";

import type {
  NotificationData,
  NotificationResponseHandler,
} from "./notification-types";

/**
 * Registry of notification handlers keyed by notification type
 */
const handlerRegistry = new Map<string, NotificationResponseHandler>();

/**
 * Default handler key for notifications without a specific type handler
 */
const DEFAULT_HANDLER_KEY = "default";

/**
 * Register a handler for a specific notification type
 * @param type - The notification type (from data.type) to handle
 * @param handler - The handler function to execute
 */
export function registerNotificationHandler(
  type: string,
  handler: NotificationResponseHandler
): void {
  handlerRegistry.set(type, handler);
}

/**
 * Unregister a handler for a specific notification type
 * @param type - The notification type to unregister
 */
export function unregisterNotificationHandler(type: string): void {
  handlerRegistry.delete(type);
}

/**
 * Register the default handler for notifications without a specific type handler
 * @param handler - The default handler function
 */
export function registerDefaultHandler(handler: NotificationResponseHandler): void {
  handlerRegistry.set(DEFAULT_HANDLER_KEY, handler);
}

/**
 * Unregister the default handler
 */
export function unregisterDefaultHandler(): void {
  handlerRegistry.delete(DEFAULT_HANDLER_KEY);
}

/**
 * Clear all registered handlers
 */
export function clearAllHandlers(): void {
  handlerRegistry.clear();
}

/**
 * Get the handler for a specific notification type
 * Falls back to default handler if no specific handler is found
 * @param type - The notification type
 * @returns The handler function or undefined
 */
export function getHandler(type: string): NotificationResponseHandler | undefined {
  return handlerRegistry.get(type) ?? handlerRegistry.get(DEFAULT_HANDLER_KEY);
}

/**
 * Check if a handler is registered for a specific type
 * @param type - The notification type to check
 * @returns Whether a handler is registered
 */
export function hasHandler(type: string): boolean {
  return handlerRegistry.has(type) || handlerRegistry.has(DEFAULT_HANDLER_KEY);
}

/**
 * Get all registered handler types
 * @returns Array of registered type keys
 */
export function getRegisteredTypes(): string[] {
  return Array.from(handlerRegistry.keys());
}

/**
 * Process a notification response by routing to the appropriate handler
 * @param response - The notification response from expo-notifications
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const data = response.notification.request.content.data as NotificationData | undefined;
  const type = data?.type;

  if (!type) {
    // No type specified, try default handler
    const defaultHandler = handlerRegistry.get(DEFAULT_HANDLER_KEY);
    if (defaultHandler) {
      await defaultHandler(response);
    }
    return;
  }

  // Try to find specific handler for this type
  const handler = handlerRegistry.get(type);
  if (handler) {
    await handler(response);
    return;
  }

  // Fall back to default handler
  const defaultHandler = handlerRegistry.get(DEFAULT_HANDLER_KEY);
  if (defaultHandler) {
    await defaultHandler(response);
  }
}

/**
 * Extract notification data from a response
 * @param response - The notification response
 * @returns The notification data or undefined
 */
export function extractNotificationData(
  response: Notifications.NotificationResponse
): NotificationData | undefined {
  return response.notification.request.content.data as NotificationData | undefined;
}

/**
 * Extract the notification type from a response
 * @param response - The notification response
 * @returns The notification type or undefined
 */
export function extractNotificationType(
  response: Notifications.NotificationResponse
): string | undefined {
  const data = extractNotificationData(response);
  return data?.type;
}

/**
 * Extract the screen path from a response (if provided)
 * @param response - The notification response
 * @returns The screen path or undefined
 */
export function extractScreenPath(
  response: Notifications.NotificationResponse
): string | undefined {
  const data = extractNotificationData(response);
  return data?.screen;
}
