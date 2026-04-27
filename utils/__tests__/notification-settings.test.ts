import { notificationSettingsService } from "../notification-settings";
import type { NotificationSettings } from "../notification-settings";

// Mock storage
jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock storage keys
jest.mock("~/constants/storage-keys", () => ({
  NOTIFICATION_SETTINGS_KEY: "notification_settings",
}));

// Mock logger
jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { storage } from "~/data";
import { log } from "~/utils/logger";

describe("notification-settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return default settings when nothing is stored", () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      const settings = notificationSettingsService.getSettings();

      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: true,
      });
    });

    it("should return default settings when storage returns null", () => {
      (storage.get as jest.Mock).mockReturnValue(null);

      const settings = notificationSettingsService.getSettings();

      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: true,
      });
    });

    it("should parse and return stored settings", () => {
      const storedSettings = {
        enabled: false,
        ingredientExpiry: false,
        achievements: true,
        challenges: false,
      };
      (storage.get as jest.Mock).mockReturnValue(JSON.stringify(storedSettings));

      const settings = notificationSettingsService.getSettings();

      expect(settings).toEqual(storedSettings);
    });

    it("should merge partial stored settings with defaults", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({ enabled: false, challenges: false })
      );

      const settings = notificationSettingsService.getSettings();

      expect(settings).toEqual({
        enabled: false,
        ingredientExpiry: true, // default
        achievements: true, // default
        challenges: false,
      });
    });

    it("should return defaults on JSON parse error", () => {
      (storage.get as jest.Mock).mockReturnValue("invalid json");

      const settings = notificationSettingsService.getSettings();

      expect(settings).toEqual({
        enabled: true,
        ingredientExpiry: true,
        achievements: true,
        challenges: true,
      });
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("should update specific settings", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      notificationSettingsService.updateSettings({ enabled: false, challenges: false });

      expect(storage.set).toHaveBeenCalledWith(
        "notification_settings",
        JSON.stringify({
          enabled: false,
          ingredientExpiry: true,
          achievements: true,
          challenges: false,
        })
      );
      expect(log.info).toHaveBeenCalled();
    });

    it("should merge updates with current settings", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      notificationSettingsService.updateSettings({ achievements: false });

      expect(storage.set).toHaveBeenCalledWith(
        "notification_settings",
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: false,
          challenges: true,
        })
      );
    });

    it("should update when no settings are stored", () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      notificationSettingsService.updateSettings({ enabled: false });

      expect(storage.set).toHaveBeenCalledWith(
        "notification_settings",
        JSON.stringify({
          enabled: false,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );
    });
  });

  describe("isNotificationDataEnabled", () => {
    it("should return false when notifications are disabled", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: false,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({ type: "test" } as any);

      expect(result).toBe(false);
    });

    it("should return true for unknown notification types", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({
        type: "unknown_type",
      } as any);

      expect(result).toBe(true);
    });

    it("should return true for notifications without type", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({} as any);

      expect(result).toBe(true);
    });

    it("should return true for notifications with null data", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled(null as any);

      expect(result).toBe(true);
    });

    it("should respect ingredientExpiry channel settings", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: false,
          achievements: true,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({
        type: "ingredient_expiry",
      } as any);

      expect(result).toBe(false);
    });

    it("should respect achievements channel settings", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: false,
          challenges: true,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({
        type: "achievement_unlocked",
      } as any);

      expect(result).toBe(false);
    });

    it("should respect challenges channel settings", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: false,
        })
      );

      const result = notificationSettingsService.isNotificationDataEnabled({
        type: "challenge_completed",
      } as any);

      expect(result).toBe(false);
    });

    it("should map legacy achievement types", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: false,
          challenges: true,
        })
      );

      const types = ["achievement_unlock", "level_up", "streak_milestone", "batch_achievement"];

      types.forEach((type) => {
        const result = notificationSettingsService.isNotificationDataEnabled({ type } as any);
        expect(result).toBe(false);
      });
    });

    it("should map legacy challenge types", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          ingredientExpiry: true,
          achievements: true,
          challenges: false,
        })
      );

      const types = [
        "challenge_complete",
        "daily_challenge_available",
        "weekly_challenge_available",
        "streak_reminder",
        "challenge_expiry_reminder",
      ];

      types.forEach((type) => {
        const result = notificationSettingsService.isNotificationDataEnabled({ type } as any);
        expect(result).toBe(false);
      });
    });

    it("should use pre-fetched settings when provided", () => {
      const settings: NotificationSettings = {
        enabled: true,
        ingredientExpiry: false,
        achievements: true,
        challenges: true,
      };

      const result = notificationSettingsService.isNotificationDataEnabled(
        { type: "ingredient_expiry" } as any,
        settings
      );

      expect(result).toBe(false);
      expect(storage.get).not.toHaveBeenCalled();
    });
  });
});
