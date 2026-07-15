import { notificationSettingsService } from "../notification-settings";
import { storage } from "~/data";
import { log } from "~/utils/logger";
import { NOTIFICATION_SETTINGS_KEY } from "~/constants/storage-keys";

jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("NotificationSettingsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return default settings when no data is in storage", () => {
      (storage.get as jest.Mock).mockReturnValueOnce(undefined);
      const settings = notificationSettingsService.getSettings();
      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: true,
      });
    });

    it("should return merged settings when valid data is in storage", () => {
      (storage.get as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ achievements: false, ingredientExpiry: false })
      );
      const settings = notificationSettingsService.getSettings();
      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: false,
        achievements: false,
        challenges: true,
      });
    });

    it("should return default settings and log warning on parse error", () => {
      (storage.get as jest.Mock).mockReturnValueOnce("invalid json");
      const settings = notificationSettingsService.getSettings();
      expect(log.warn).toHaveBeenCalledWith(
        "Failed to parse notification settings:",
        expect.any(SyntaxError)
      );
      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: true,
      });
    });
  });

  describe("updateSettings", () => {
    it("should update settings and save to storage", () => {
      (storage.get as jest.Mock).mockReturnValueOnce(undefined);
      notificationSettingsService.updateSettings({ challenges: false });

      expect(storage.set).toHaveBeenCalledWith(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: false,
        })
      );
      expect(log.info).toHaveBeenCalledWith("Notification settings updated:", {
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: false,
      });
    });
  });

  describe("isNotificationDataEnabled", () => {
    it("should return false if globally disabled", () => {
      expect(
        notificationSettingsService.isNotificationDataEnabled(
          { type: "ingredient_expiry" },
          { enabled: false, ingredientExpiry: true, achievements: true, challenges: true }
        )
      ).toBe(false);
    });

    it("should return true if no data or data type is provided", () => {
      expect(notificationSettingsService.isNotificationDataEnabled(undefined)).toBe(true);
      expect(notificationSettingsService.isNotificationDataEnabled({ type: "" })).toBe(true);
    });

    it("should return true for unknown channels", () => {
      expect(notificationSettingsService.isNotificationDataEnabled({ type: "unknown_type" })).toBe(
        true
      );
    });

    it("should correctly handle ingredientExpiry channel", () => {
      expect(
        notificationSettingsService.isNotificationDataEnabled(
          { type: "ingredient_expiry" },
          { enabled: true, ingredientExpiry: true, achievements: true, challenges: true }
        )
      ).toBe(true);

      expect(
        notificationSettingsService.isNotificationDataEnabled(
          { type: "ingredient_expiry" },
          { enabled: true, ingredientExpiry: false, achievements: true, challenges: true }
        )
      ).toBe(false);
    });

    it("should correctly handle achievements channel", () => {
      const achievementTypes = [
        "achievement_unlocked",
        "achievement_unlock",
        "level_up",
        "streak_milestone",
        "batch_achievement",
      ];

      achievementTypes.forEach((type) => {
        expect(
          notificationSettingsService.isNotificationDataEnabled(
            { type },
            { enabled: true, ingredientExpiry: true, achievements: true, challenges: true }
          )
        ).toBe(true);

        expect(
          notificationSettingsService.isNotificationDataEnabled(
            { type },
            { enabled: true, ingredientExpiry: true, achievements: false, challenges: true }
          )
        ).toBe(false);
      });
    });

    it("should correctly handle challenges channel", () => {
      const challengeTypes = [
        "challenge_completed",
        "challenge_complete",
        "daily_challenge_available",
        "weekly_challenge_available",
        "streak_reminder",
        "challenge_expiry_reminder",
      ];

      challengeTypes.forEach((type) => {
        expect(
          notificationSettingsService.isNotificationDataEnabled(
            { type },
            { enabled: true, ingredientExpiry: true, achievements: true, challenges: true }
          )
        ).toBe(true);

        expect(
          notificationSettingsService.isNotificationDataEnabled(
            { type },
            { enabled: true, ingredientExpiry: true, achievements: true, challenges: false }
          )
        ).toBe(false);
      });
    });
  });
});
