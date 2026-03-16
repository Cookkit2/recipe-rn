import * as Notifications from "expo-notifications";

// ============================================
// Trigger Types
// ============================================

export interface TimeIntervalTrigger {
  seconds: number;
  repeats?: boolean;
}

export interface DateTrigger {
  date: Date;
}

export interface DailyTrigger {
  hour: number;
  minute: number;
  repeats: true;
}

export interface WeeklyTrigger {
  weekday: number; // 1-7, Sunday = 1
  hour: number;
  minute: number;
  repeats: true;
}

export type NotificationTrigger = TimeIntervalTrigger | DateTrigger | DailyTrigger | WeeklyTrigger;

// ============================================
// Notification Data
// ============================================

export interface NotificationData {
  type: string;
  screen?: string;
  [key: string]: unknown;
}

// ============================================
// Schedule Options
// ============================================

export interface ScheduleNotificationOptions {
  id?: string;
  title: string;
  body: string;
  subtitle?: string;
  data?: NotificationData;
  trigger: NotificationTrigger;
  sound?: boolean;
  badge?: number;
}

// ============================================
// Permission Result
// ============================================

export interface NotificationPermissionResult {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
}

// ============================================
// Foreground Behavior
// ============================================

export interface ForegroundNotificationBehavior {
  shouldShowBanner: boolean;
  shouldShowList: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

// ============================================
// Handler Types
// ============================================

export type NotificationResponseHandler = (
  response: Notifications.NotificationResponse
) => void | Promise<void>;

// ============================================
// Expiry Item
// ============================================

export interface ExpiryItem {
  id: string;
  name: string;
  expiry_date?: Date;
}

// ============================================
// Scheduled Notification (for querying)
// ============================================

export type ScheduledNotification = Notifications.NotificationRequest;
