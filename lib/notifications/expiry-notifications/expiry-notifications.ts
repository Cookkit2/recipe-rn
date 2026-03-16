import { scheduleNotification, cancelNotification } from "../notification-service";
import type { ExpiryItem } from "../notification-types";
import { notificationSettingsService } from "~/utils/notification-settings";
import { recipeApi } from "~/data/api/recipeApi";
import {
  EXPIRY_NOTIFICATION_DAYS_BEFORE,
  EXPIRY_NOTIFICATION_BATCH_WINDOW_MS,
  EXPIRY_NOTIFICATION_HOUR_UTC,
  EXPIRY_NOTIFICATION_TITLE,
  EXPIRY_NOTIFICATION_BODY_SINGLE,
  EXPIRY_NOTIFICATION_BODY_MULTIPLE,
} from "~/constants/notifications";

// ============================================
// Expiry Notification ID Helpers
// ============================================

function getExpiryNotificationId(ingredientId: string): string {
  return `expiry-${ingredientId}`;
}

// ============================================
// Schedule Expiry Notifications
// ============================================

/**
 * Schedule expiry notifications for a batch of ingredients.
 *
 * Features:
 * - Skips items without an expiry_date
 * - Skips items where the notification time is already in the past
 * - Groups items expiring within 6 hours to prevent notification spam
 * - Sends notifications 1 day before expiry at 9 AM UTC
 * - Includes recipe suggestions based on expiring ingredients
 * - Uses `ingredient_expiry` type for handler routing
 */
export async function scheduleExpiryNotifications(items: ExpiryItem[]): Promise<void> {
  const settings = notificationSettingsService.getSettings();

  if (!settings.enabled || !settings.ingredientExpiry) {
    return;
  }

  // Filter to items that have an expiry date
  const itemsWithExpiry = items.filter(
    (item): item is ExpiryItem & { expiry_date: Date } => item.expiry_date != null
  );

  if (itemsWithExpiry.length === 0) return;

  // Sort by expiry date (earliest first)
  const sorted = [...itemsWithExpiry].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );

  // Group items that expire within BATCH_WINDOW_MS of each other
  type ItemWithExpiry = (typeof sorted)[number];
  const groups: Array<{ items: ItemWithExpiry[]; notificationDate: Date }> = [];
  let currentGroup: ItemWithExpiry[] = [];
  let groupAnchorTime: number | null = null;

  for (const item of sorted) {
    const expiryTime = new Date(item.expiry_date).getTime();

    if (
      groupAnchorTime === null ||
      expiryTime - groupAnchorTime > EXPIRY_NOTIFICATION_BATCH_WINDOW_MS
    ) {
      // Start a new group
      if (currentGroup.length > 0) {
        groups.push({
          items: currentGroup,
          notificationDate: calculateNotificationDate(new Date(currentGroup[0]!.expiry_date)),
        });
      }
      currentGroup = [item];
      groupAnchorTime = expiryTime;
    } else {
      currentGroup.push(item);
    }
  }

  // Push the last group
  if (currentGroup.length > 0) {
    groups.push({
      items: currentGroup,
      notificationDate: calculateNotificationDate(new Date(currentGroup[0]!.expiry_date)),
    });
  }

  const now = new Date();
  const futureGroups = groups.filter((g) => g.notificationDate > now);
  if (futureGroups.length === 0) return;

  const { recipes } = await recipeApi.getRecipeRecommendationsForExpiring({
    daysBeforeExpiry: EXPIRY_NOTIFICATION_DAYS_BEFORE + 1,
    maxRecommendations: 5,
  });
  const recipeIds = recipes.slice(0, 3).map((r) => r.recipe.id);

  for (const group of futureGroups) {

    const triggerDate = group.notificationDate;
    const firstItem = group.items[0]!;

    const body =
      group.items.length === 1
        ? EXPIRY_NOTIFICATION_BODY_SINGLE(firstItem.name)
        : EXPIRY_NOTIFICATION_BODY_MULTIPLE(group.items.length);
    const title =
      group.items.length === 1
        ? EXPIRY_NOTIFICATION_TITLE
        : `${group.items.length} ingredients expiring soon`;

    for (const item of group.items) {
      const notificationId = getExpiryNotificationId(item.id);

      await scheduleNotification({
        id: notificationId,
        title,
        body,
        data: {
          type: "ingredient_expiry",
          ingredientIds: group.items.map((groupItem) => groupItem.id),
          ...(recipeIds.length > 0 && { recipeIds }),
        },
        trigger: { date: triggerDate },
      });
    }
  }
}

// ============================================
// Cancel Expiry Notification
// ============================================

/**
 * Cancel an expiry notification for a specific ingredient.
 */
export async function cancelExpiryNotification(ingredientId: string): Promise<void> {
  try {
    await cancelNotification(getExpiryNotificationId(ingredientId));
  } catch {
    // Notification might not exist; ignore
  }
}

// ============================================
// Reschedule Expiry Notification
// ============================================

/**
 * Cancel an existing expiry notification and schedule a new one.
 * Useful when an ingredient's expiry date is updated.
 */
export async function rescheduleExpiryNotification(item: ExpiryItem): Promise<void> {
  await cancelExpiryNotification(item.id);

  if (item.expiry_date) {
    await scheduleExpiryNotifications([item]);
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Calculate when to send a notification for a given expiry date.
 * Sends EXPIRY_NOTIFICATION_DAYS_BEFORE days before, at EXPIRY_NOTIFICATION_HOUR_UTC.
 */
function calculateNotificationDate(expiryDate: Date): Date {
  const notifDate = new Date(expiryDate);
  notifDate.setUTCDate(notifDate.getUTCDate() - EXPIRY_NOTIFICATION_DAYS_BEFORE);
  notifDate.setUTCHours(EXPIRY_NOTIFICATION_HOUR_UTC, 0, 0, 0);
  return notifDate;
}
