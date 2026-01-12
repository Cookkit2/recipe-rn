import type * as Notifications from "expo-notifications";

/**
 * Data payload for notifications - used for handler routing and navigation
 */
export interface NotificationData {
  /** Type identifier for routing to the correct handler */
  type: string;
  /** Optional screen path for navigation */
  screen?: string;
  /** Additional custom data */
  [key: string]: unknown;
}

/**
 * Time interval trigger - fires after specified seconds
 */
export interface TimeIntervalTrigger {
  seconds: number;
  repeats?: boolean;
}

/**
 * Date trigger - fires at a specific date/time
 */
export interface DateTrigger {
  date: Date;
}

/**
 * Daily trigger - fires at a specific time each day
 */
export interface DailyTrigger {
  hour: number;
  minute: number;
  repeats: true;
}

/**
 * Weekly trigger - fires at a specific time on specific days
 */
export interface WeeklyTrigger {
  weekday: number; // 1-7, Sunday = 1
  hour: number;
  minute: number;
  repeats: true;
}

/**
 * Union type for all supported notification triggers
 */
export type NotificationTrigger =
  | TimeIntervalTrigger
  | DateTrigger
  | DailyTrigger
  | WeeklyTrigger;

/**
 * Options for scheduling a notification
 */
export interface ScheduleNotificationOptions {
  /** Optional custom identifier - useful for canceling specific notifications */
  id?: string;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional subtitle (iOS only) */
  subtitle?: string;
  /** Custom data payload */
  data?: NotificationData;
  /** When to trigger the notification */
  trigger: NotificationTrigger;
  /** Whether to play sound (default: true) */
  sound?: boolean;
  /** Badge number to set (iOS) */
  badge?: number;
}

/**
 * Handler function type for processing notification responses
 */
export type NotificationResponseHandler = (
  response: Notifications.NotificationResponse
) => void | Promise<void>;

/**
 * Handler function type for processing received notifications (foreground)
 */
export type NotificationReceivedHandler = (
  notification: Notifications.Notification
) => void | Promise<void>;

/**
 * Configuration for foreground notification behavior
 */
export interface ForegroundNotificationBehavior {
  /** Show notification as banner/alert */
  shouldShowBanner: boolean;
  /** Add to notification list/center */
  shouldShowList: boolean;
  /** Play notification sound */
  shouldPlaySound: boolean;
  /** Set badge number */
  shouldSetBadge: boolean;
}

/**
 * Props for NotificationProvider component
 */
export interface NotificationProviderProps {
  children: React.ReactNode;
  /**
   * Callback to determine foreground notification behavior
   * If not provided, defaults to showing banner and list
   */
  onForegroundNotification?: (
    notification: Notifications.Notification
  ) => ForegroundNotificationBehavior;
}

/**
 * Result of permission request
 */
export interface NotificationPermissionResult {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
}

/**
 * Scheduled notification info
 */
export interface ScheduledNotification {
  id: string;
  content: {
    title: string | null;
    body: string | null;
    data: NotificationData | null;
  };
  trigger: NotificationTrigger | null;
}
