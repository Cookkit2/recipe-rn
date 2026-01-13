// Notification Service - Core scheduling and management functions
export {
  cancelAllNotifications,
  cancelNotification,
  dismissAllNotifications,
  dismissNotification,
  getBadgeCount,
  getNotificationPermissions,
  getScheduledNotifications,
  initializeNotifications,
  requestNotificationPermissions,
  scheduleNotification,
  setBadgeCount,
} from "./notification-service";

// Notification Handler - Registry pattern for handling responses
export {
  clearAllHandlers,
  extractNotificationData,
  extractNotificationType,
  extractScreenPath,
  getHandler,
  getRegisteredTypes,
  handleNotificationResponse,
  hasHandler,
  registerDefaultHandler,
  registerNotificationHandler,
  unregisterDefaultHandler,
  unregisterNotificationHandler,
} from "./notification-handler";

// Notification Provider - React context and listeners
export {
  NotificationProvider,
  useLastNotificationResponse,
  useNotificationContext,
} from "./NotificationProvider";

// Expiry Notifications - Ingredient expiry scheduling
export {
  cancelExpiryNotification,
  scheduleExpiryNotifications,
} from "./expiry-notifications/expiry-notifications";

export type { ExpiryItem } from "./expiry-notifications/expiry-notifications";

// Types
export type {
  DailyTrigger,
  DateTrigger,
  ForegroundNotificationBehavior,
  NotificationData,
  NotificationPermissionResult,
  NotificationProviderProps,
  NotificationReceivedHandler,
  NotificationResponseHandler,
  NotificationTrigger,
  ScheduledNotification,
  ScheduleNotificationOptions,
  TimeIntervalTrigger,
  WeeklyTrigger,
} from "./notification-types";
