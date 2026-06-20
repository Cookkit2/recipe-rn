import { scheduleNotification, cancelNotification } from "../notification-service";
import { notificationSettingsService } from "~/utils/notification-settings";
import { recipeApi } from "~/data/api/recipeApi";
import { log } from "~/utils/logger";
import { emitExpiringNudgeShown } from "~/lib/analytics/funnel-events";

/**
 * Expiring-ingredient RE-ENGAGEMENT nudge (issue #726, scoped retention feature).
 *
 * Distinct from `scheduleExpiryNotifications` (in expiry-notifications.ts), which
 * schedules a one-shot DateTrigger per ingredient 1 day before that specific
 * item expires. This module schedules a single RECURRING daily nudge whose only
 * purpose is to pull the user back into the app when their pantry has items
 * near expiry — tying together the existing recommendation infra (recipes ranked
 * by ExpiringIngredientsRankingStrategy) and the existing notifications service.
 *
 * Re-engagement is the defensive priority [F9] calls out for AI-leaning apps:
 * ongoing value delivery is the churn defense. This is ONE nudge path, scheduled
 * + dismissible, reusing existing infra. Streaks/badges/other churn levers are
 * deferred to follow-ups (see PR body).
 *
 * Design constraints (matched to existing patterns):
 *  - Honors the single-read settings gate: `scheduleNotification` already calls
 *    `notificationSettingsService.isNotificationDataEnabled` against the
 *    `ingredient_expiry` type → `ingredientExpiry` channel, AND the global
 *    `enabled` gate. We additionally short-circuit on `ingredientExpiry` here
 *    to avoid an unnecessary recipeApi round-trip when the channel is off.
 *  - Routes via the existing `ingredient_expiry` type so the existing deep-link
 *    handler in useNotificationHandlers.ts (router.push to first recipe / home)
 *    lands the user on a recipe that uses the expiring ingredients — no new
 *    handler wiring needed.
 */

// ============================================
// Constants
// ============================================

/** Stable id so the recurring nudge can be cancelled/rescheduled in place. */
export const EXPIRY_REENGAGEMENT_NOTIFICATION_ID = "expiry-reengagement";

/**
 * Device-local hour to fire the recurring nudge (matches the achievement streak
 * reminder convention). 18:00 local — end of the cooking-decision window.
 */
export const EXPIRY_REENGAGEMENT_HOUR = 18;
export const EXPIRY_REENGAGEMENT_MINUTE = 0;

/** How many ranked recipes to attach as deep-link targets. */
const MAX_RECIPE_LINKS = 3;

// ============================================
// Schedule / Cancel
// ============================================

/**
 * Schedule the recurring expiring-ingredient re-engagement nudge.
 *
 * Behaviour:
 *  - No-op when the global `enabled` gate or the `ingredientExpiry` channel is off.
 *  - No-op when the pantry currently has NO items near expiry (so we never nag a
 *    user with a stocked pantry).
 *  - Otherwise schedules (or replaces, via the stable id) a daily nudge whose
 *    body names the ingredient count and whose `data.recipeIds` link to recipes
 *    ranked by how many expiring ingredients they use.
 *
 * Idempotent: calling it again replaces the previously scheduled nudge.
 */
export async function scheduleExpiryReengagementNotification(): Promise<void> {
  const settings = notificationSettingsService.getSettings();
  if (!settings.enabled || !settings.ingredientExpiry) {
    return;
  }

  // Pull ranked recipes + the set of expiring ingredient ids via the existing
  // recommendation path (ExpiringIngredientsRankingStrategy under the hood).
  const { recipes, expiringIngredientIds } = await recipeApi.getRecipeRecommendationsForExpiring({
    maxRecommendations: MAX_RECIPE_LINKS,
  });

  if (expiringIngredientIds.size === 0) {
    // Nothing expiring — cancel any previously scheduled nudge so we don't fire
    // a stale one once the pantry clears.
    await cancelExpiryReengagementNotification();
    return;
  }

  const expiringCount = expiringIngredientIds.size;
  const recipeIds = recipes.slice(0, MAX_RECIPE_LINKS).map((r) => r.recipe.id);

  const title = "Use these ingredients soon";
  const body =
    expiringCount === 1
      ? "1 ingredient in your pantry is expiring soon. Tap for recipe ideas."
      : `${expiringCount} ingredients in your pantry are expiring soon. Tap for recipe ideas.`;

  try {
    await scheduleNotification({
      id: EXPIRY_REENGAGEMENT_NOTIFICATION_ID,
      title,
      body,
      data: {
        type: "ingredient_expiry",
        // Marks this as the recurring re-engagement nudge so the deep-link
        // handler can attribute engagement to the notification surface (not the
        // in-app section) for funnel analytics.
        surface: "reengagement_notification",
        ...(recipeIds.length > 0 && { recipeIds }),
      },
      trigger: {
        hour: EXPIRY_REENGAGEMENT_HOUR,
        minute: EXPIRY_REENGAGEMENT_MINUTE,
        repeats: true,
      },
    });
    // Instrument the scheduled nudge so a baseline can be established before
    // iterating on cadence (#726 observability AC; #718 funnel layer).
    emitExpiringNudgeShown("reengagement_notification", expiringCount);
  } catch (error) {
    // Scheduling must never break the surrounding flow (matches the
    // fire-and-forget analytics convention). Log + swallow.
    log.warn("[notifications] Failed to schedule expiry re-engagement nudge:", error);
  }
}

/**
 * Cancel the recurring expiring-ingredient re-engagement nudge.
 *
 * Called when the channel is toggled off, or when the pantry has no expiring
 * items. Safe to call when nothing is scheduled (cancelNotification is a no-op
 * for unknown ids at the expo-notifications layer).
 */
export async function cancelExpiryReengagementNotification(): Promise<void> {
  try {
    await cancelNotification(EXPIRY_REENGAGEMENT_NOTIFICATION_ID);
  } catch {
    // Notification might not exist; ignore.
  }
}
