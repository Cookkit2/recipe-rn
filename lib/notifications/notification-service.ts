import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type {
  ScheduleNotificationOptions,
  NotificationPermissionResult,
  ScheduledNotification,
  NotificationData,
} from "./notification-types";
import { notificationSettingsService } from "~/utils/notification-settings";

// ============================================
// Notification Channel (Android)
// ============================================

/**
 * Initialize notification settings.
 * On Android 8+, creates a default notification channel.
 */
export async function initializeNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }
}

// ============================================
// Scheduling
// ============================================

/**
 * Schedule a local notification.
 * Returns the notification identifier for later cancellation.
 */
export async function scheduleNotification(options: ScheduleNotificationOptions): Promise<string> {
  const { id, title, body, subtitle, data, trigger, sound = true, badge } = options;

  // Respect user notification preferences (single read; pass to channel check).
  const settings = notificationSettingsService.getSettings();
  if (!settings.enabled) {
    // Notifications are globally disabled; pretend scheduling succeeded but do nothing.
    return id ?? `notifications_disabled_${Date.now()}`;
  }

  const payload = data as NotificationData | undefined;
  if (!notificationSettingsService.isNotificationDataEnabled(payload, settings)) {
    return id ?? `notifications_disabled_${Date.now()}`;
  }

  // Build the expo-notifications trigger input
  let triggerInput: Notifications.NotificationTriggerInput;

  if ("seconds" in trigger) {
    triggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: trigger.seconds,
      repeats: trigger.repeats ?? false,
    };
  } else if ("date" in trigger) {
    triggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger.date,
    };
  } else if ("weekday" in trigger) {
    triggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: trigger.weekday,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  } else {
    triggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      subtitle,
      data: data ?? {},
      sound: sound ? "default" : undefined,
      badge,
    },
    trigger: triggerInput,
  });

  return identifier;
}

// ============================================
// Cancellation
// ============================================

/**
 * Cancel a scheduled notification by its identifier.
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================
// Query
// ============================================

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ============================================
// Permissions
// ============================================

/**
 * Request notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const { status, granted } = await Notifications.requestPermissionsAsync();

  return {
    granted,
    status: status as NotificationPermissionResult["status"],
  };
}

/**
 * Get current notification permissions without prompting.
 */
export async function getNotificationPermissions(): Promise<NotificationPermissionResult> {
  const { status, granted } = await Notifications.getPermissionsAsync();

  return {
    granted,
    status: status as NotificationPermissionResult["status"],
  };
}

// ============================================
// Badge Management (iOS)
// ============================================

/**
 * Get the current app badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the app badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// ============================================
// Dismiss (from notification tray)
// ============================================

/**
 * Dismiss a delivered notification from the tray.
 * Does NOT cancel scheduled notifications.
 */
export async function dismissNotification(id: string): Promise<void> {
  await Notifications.dismissNotificationAsync(id);
}

/**
 * Dismiss all delivered notifications from the tray.
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
