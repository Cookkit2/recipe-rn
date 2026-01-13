// ============================================
// Expiry Notification Constants
// ============================================

// How many days before expiry to send notification
export const EXPIRY_NOTIFICATION_DAYS_BEFORE = 1;

// Time window for batching notifications (in milliseconds)
// If two items expire within this window, only schedule the earliest
export const EXPIRY_NOTIFICATION_BATCH_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

// Hour to send notification in UTC (9 AM UTC = varies by local timezone)
// This ensures consistent timing regardless of device timezone changes
// 9 AM UTC = 4 AM EST / 1 AM PST / 5 PM JST
export const EXPIRY_NOTIFICATION_HOUR_UTC = 9;

// Notification content
export const EXPIRY_NOTIFICATION_TITLE = "Ingredients Expiring Soon";

export const EXPIRY_NOTIFICATION_BODY_SINGLE = (name: string): string =>
  `Your ${name} is expiring soon! Use it before it goes bad.`;

export const EXPIRY_NOTIFICATION_BODY_MULTIPLE = (count: number): string =>
  `${count} ingredients are expiring soon. Check your pantry!`;
