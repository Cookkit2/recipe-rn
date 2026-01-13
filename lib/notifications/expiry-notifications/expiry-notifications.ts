import {
  EXPIRY_NOTIFICATION_BATCH_WINDOW_MS,
  EXPIRY_NOTIFICATION_BODY_MULTIPLE,
  EXPIRY_NOTIFICATION_BODY_SINGLE,
  EXPIRY_NOTIFICATION_DAYS_BEFORE,
  EXPIRY_NOTIFICATION_HOUR_UTC,
  EXPIRY_NOTIFICATION_TITLE,
} from "~/constants/notifications";

import { cancelNotification, scheduleNotification } from "../notification-service";

/**
 * Interface for items that can have expiry notifications scheduled
 */
export interface ExpiryItem {
  id: string;
  name: string;
  expiry_date?: Date;
}

/**
 * Schedule expiry notifications for a batch of ingredients
 * Groups items within BATCH_WINDOW and only schedules earliest notification per group
 *
 * @param items - Array of items with id, name, and optional expiry_date
 */
export async function scheduleExpiryNotifications(
  items: ExpiryItem[]
): Promise<void> {
  // Filter items with valid expiry dates
  const itemsWithExpiry = items.filter(
    (item): item is ExpiryItem & { expiry_date: Date } =>
      item.expiry_date !== undefined
  );

  if (itemsWithExpiry.length === 0) return;

  // Sort by expiry date (earliest first)
  const sorted = [...itemsWithExpiry].sort(
    (a, b) => a.expiry_date.getTime() - b.expiry_date.getTime()
  );

  // Group items within batch window
  const groups = groupByTimeWindow(sorted, EXPIRY_NOTIFICATION_BATCH_WINDOW_MS);

  // Schedule one notification per group
  for (const group of groups) {
    const firstItem = group[0];
    if (!firstItem) continue; // Safety check (groups are guaranteed non-empty)

    const notificationTime = calculateNotificationTime(firstItem.expiry_date);

    // Skip if notification time is in the past
    if (notificationTime.getTime() <= Date.now()) continue;

    const notificationId = `expiry-${firstItem.id}`;
    const body =
      group.length === 1
        ? EXPIRY_NOTIFICATION_BODY_SINGLE(firstItem.name)
        : EXPIRY_NOTIFICATION_BODY_MULTIPLE(group.length);

    await scheduleNotification({
      id: notificationId,
      title: EXPIRY_NOTIFICATION_TITLE,
      body,
      data: {
        type: "ingredient_expiry",
        screen: "/", // Navigate to pantry
        ingredientIds: group.map((item) => item.id),
      },
      trigger: { date: notificationTime },
    });
  }
}

/**
 * Cancel an expiry notification for a specific ingredient
 *
 * @param ingredientId - The ID of the ingredient whose notification should be cancelled
 */
export async function cancelExpiryNotification(
  ingredientId: string
): Promise<void> {
  await cancelNotification(`expiry-${ingredientId}`);
}

/**
 * Calculate notification time in UTC (X days before expiry)
 * Using UTC ensures consistent timing regardless of device timezone changes
 *
 * @param expiryDate - The expiry date of the ingredient
 * @returns The date/time when the notification should fire
 */
function calculateNotificationTime(expiryDate: Date): Date {
  const notificationTime = new Date(expiryDate);
  // Subtract days before expiry
  notificationTime.setUTCDate(
    notificationTime.getUTCDate() - EXPIRY_NOTIFICATION_DAYS_BEFORE
  );
  // Set to configured hour in UTC (e.g., 9 AM UTC)
  notificationTime.setUTCHours(EXPIRY_NOTIFICATION_HOUR_UTC, 0, 0, 0);
  return notificationTime;
}

/**
 * Group items where consecutive expiry dates are within the time window
 * This prevents notification spam when multiple items expire around the same time
 *
 * @param sortedItems - Items sorted by expiry date (earliest first)
 * @param windowMs - Time window in milliseconds for grouping
 * @returns Array of item groups
 */
function groupByTimeWindow<T extends { expiry_date: Date }>(
  sortedItems: T[],
  windowMs: number
): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];

  for (const item of sortedItems) {
    const lastItem = currentGroup[currentGroup.length - 1];

    if (!lastItem) {
      // First item in group
      currentGroup.push(item);
    } else {
      const timeDiff =
        item.expiry_date.getTime() - lastItem.expiry_date.getTime();

      if (timeDiff <= windowMs) {
        currentGroup.push(item);
      } else {
        groups.push(currentGroup);
        currentGroup = [item];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
