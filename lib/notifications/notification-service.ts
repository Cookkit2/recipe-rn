import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type {
  NotificationPermissionResult,
  ScheduledNotification,
  ScheduleNotificationOptions,
} from "./notification-types";

// Default notification channel for Android
const DEFAULT_CHANNEL_ID = "default";
const DEFAULT_CHANNEL_NAME = "Default Notifications";

/**
 * Initialize notification settings (call once on app start)
 * Creates Android notification channel if needed
 */
export async function initializeNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: DEFAULT_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
      sound: "default",
    });
  }
}

/**
 * Request notification permissions from the user
 * @returns Permission result with granted status
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return { granted: true, status: "granted" };
  }

  const { status } = await Notifications.requestPermissionsAsync();

  return {
    granted: status === "granted",
    status: status as "granted" | "denied" | "undetermined",
  };
}

/**
 * Get current notification permissions
 * @returns Permission result with current status
 */
export async function getNotificationPermissions(): Promise<NotificationPermissionResult> {
  const { status } = await Notifications.getPermissionsAsync();

  return {
    granted: status === "granted",
    status: status as "granted" | "denied" | "undetermined",
  };
}

/**
 * Schedule a local notification
 * @param options - Notification content and trigger options
 * @returns The notification identifier
 */
export async function scheduleNotification(
  options: ScheduleNotificationOptions
): Promise<string> {
  const { id, title, body, subtitle, data, trigger, sound = true, badge } = options;

  // If custom ID provided, cancel any existing notification with that ID
  if (id) {
    await cancelNotification(id);
  }

  // Build the trigger input based on trigger type
  const triggerInput = buildTriggerInput(trigger);

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      subtitle,
      data: data ?? {},
      sound,
      badge,
    },
    trigger: triggerInput,
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification by its identifier
 * @param notificationId - The notification identifier to cancel
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all currently scheduled notifications
 * @returns Array of scheduled notification info
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.map((notification) => ({
    id: notification.identifier,
    content: {
      title: notification.content.title,
      body: notification.content.body,
      data: notification.content.data as ScheduledNotification["content"]["data"],
    },
    trigger: notification.trigger as ScheduledNotification["trigger"],
  }));
}

/**
 * Dismiss a displayed notification from the notification tray
 * @param notificationId - The notification identifier to dismiss
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(notificationId);
}

/**
 * Dismiss all displayed notifications from the notification tray
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get the badge count (iOS)
 * @returns Current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count (iOS)
 * @param count - Badge count to set
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Build the trigger input for expo-notifications
 */
function buildTriggerInput(
  trigger: ScheduleNotificationOptions["trigger"]
): Notifications.NotificationTriggerInput {
  // Time interval trigger
  if ("seconds" in trigger) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: trigger.seconds,
      repeats: trigger.repeats ?? false,
    };
  }

  // Date trigger
  if ("date" in trigger) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger.date,
    };
  }

  // Daily trigger
  if ("hour" in trigger && "minute" in trigger && !("weekday" in trigger)) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  }

  // Weekly trigger
  if ("weekday" in trigger) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: trigger.weekday,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  }

  // Fallback - immediate notification
  return null;
}
