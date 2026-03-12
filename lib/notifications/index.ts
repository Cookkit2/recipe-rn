// ============================================
// Notification Service
// ============================================

export {
  initializeNotifications,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  requestNotificationPermissions,
  getNotificationPermissions,
  getBadgeCount,
  setBadgeCount,
  dismissNotification,
  dismissAllNotifications,
} from "./notification-service";

// ============================================
// Notification Handler
// ============================================

export {
  registerNotificationHandler,
  unregisterNotificationHandler,
  registerDefaultHandler,
  dispatchNotificationResponse,
  extractNotificationData,
  extractNotificationType,
  extractScreenPath,
  hasHandler,
  getRegisteredTypes,
  ACHIEVEMENT_UNLOCKED_TYPE,
  CHALLENGE_COMPLETED_TYPE,
  INGREDIENT_EXPIRY_TYPE,
} from "./notification-handler";

// ============================================
// Notification Provider
// ============================================

export {
  NotificationProvider,
  useNotificationContext,
  useLastNotificationResponse,
} from "./NotificationProvider";

// ============================================
// Expiry Notifications
// ============================================

export {
  scheduleExpiryNotifications,
  cancelExpiryNotification,
  rescheduleExpiryNotification,
} from "./expiry-notifications/expiry-notifications";

// ============================================
// Types
// ============================================

export type {
  NotificationData,
  NotificationTrigger,
  TimeIntervalTrigger,
  DateTrigger,
  DailyTrigger,
  WeeklyTrigger,
  ScheduleNotificationOptions,
  NotificationPermissionResult,
  ForegroundNotificationBehavior,
  NotificationResponseHandler,
  ExpiryItem,
  ScheduledNotification,
} from "./notification-types";
