import { storage } from "~/data";
import { NOTIFICATION_SETTINGS_KEY } from "~/constants/storage-keys";
import type { NotificationData } from "~/lib/notifications";
import { log } from "~/utils/logger";

export interface NotificationSettings {
  enabled: boolean;
  ingredientExpiry: boolean;
  achievements: boolean;
  challenges: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  ingredientExpiry: true,
  achievements: true,
  challenges: true,
};

type NotificationChannel = "ingredientExpiry" | "achievements" | "challenges";

class NotificationSettingsService {
  getSettings(): NotificationSettings {
    try {
      const stored = storage.get<string | undefined>(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationSettings>;
        return {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...parsed,
        };
      }
    } catch (error) {
      log.warn("Failed to parse notification settings:", error);
    }

    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  updateSettings(updates: Partial<NotificationSettings>): void {
    const current = this.getSettings();
    const next: NotificationSettings = {
      ...current,
      ...updates,
    };

    storage.set(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next));
    log.info("Notification settings updated:", next);
  }

  /**
   * Determine whether a given notification data payload is allowed
   * under the current settings. Pass pre-fetched settings to avoid a second read.
   */
  isNotificationDataEnabled(data?: NotificationData, settings?: NotificationSettings): boolean {
    const s = settings ?? this.getSettings();

    if (!s.enabled) {
      return false;
    }

    if (!data || !data.type) {
      // No type information – treat as allowed by default.
      return true;
    }

    const channel = this.mapTypeToChannel(data.type);
    if (!channel) {
      // Unknown types are not controlled by user settings.
      return true;
    }

    return s[channel];
  }

  /**
   * Map low-level notification type identifiers to coarse user-facing channels.
   * String literals are used here to avoid circular dependencies.
   */
  private mapTypeToChannel(type: string): NotificationChannel | null {
    if (type === "ingredient_expiry") {
      return "ingredientExpiry";
    }

    // Achievements & level-ups (standardized and legacy type names)
    if (
      type === "achievement_unlocked" ||
      type === "achievement_unlock" ||
      type === "level_up" ||
      type === "streak_milestone" ||
      type === "batch_achievement"
    ) {
      return "achievements";
    }

    // Challenges & reminders (standardized and legacy type names)
    if (
      type === "challenge_completed" ||
      type === "challenge_complete" ||
      type === "daily_challenge_available" ||
      type === "weekly_challenge_available" ||
      type === "streak_reminder" ||
      type === "challenge_expiry_reminder"
    ) {
      return "challenges";
    }

    return null;
  }
}

export const notificationSettingsService = new NotificationSettingsService();

