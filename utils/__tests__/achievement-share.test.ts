import { Platform } from "react-native";
import { generateAchievementShareContent, supportsActivityType } from "../achievement-share";
import type { AchievementProgress } from "~/types/achievements";

// Mock store URL
jest.mock("expo-store-review", () => ({
  storeUrl: jest.fn(() => "https://test-store-url.com"),
}));

describe("Achievement Share Utilities", () => {
  describe("generateAchievementShareContent", () => {
    // Base achievement object for testing
    const baseAchievement: AchievementProgress = {
      achievement: {
        id: "test-ach-1",
        type: "milestone",
        category: "recipes",
        title: "First Recipe",
        description: "Cook your first recipe.",
        icon: "🍳",
        requirement: {
          type: "count",
          target: 1,
          metric: "recipes_cooked",
        },
        xp: 50,
        sortOrder: 1,
      },
      progress: 1,
      progressPercentage: 100,
      isUnlocked: true,
      isLocked: false,
      isInProgress: false,
    };

    it("should generate correct content for an unlocked achievement without options", () => {
      const result = generateAchievementShareContent(baseAchievement);

      expect(result.title).toBe("Cookkit - First Recipe");
      expect(result.message).toContain("🏆 Achievement Unlocked!");
      expect(result.message).toContain("I just 🍳 First Recipe");
      expect(result.message).toContain("Cook your first recipe.");
      expect(result.message).toContain("Completed! 🎉");
      expect(result.message).toContain("+50 XP earned! ⭐");
      expect(result.message).toContain("🍳 Recipe Milestones on Cookkit");
      expect(result.message).toContain("#Cookkit #HomeCooking #Recipe");
      expect(result.url).toBe("https://test-store-url.com");
    });

    it("should include userName in the message when provided", () => {
      const result = generateAchievementShareContent(baseAchievement, {
        userName: "Chef Jules",
      });

      expect(result.message).toContain("Chef Jules just 🍳 First Recipe");
    });

    it("should handle locked (in-progress) achievements correctly", () => {
      const inProgressAchievement: AchievementProgress = {
        ...baseAchievement,
        progress: 0,
        progressPercentage: 0,
        isUnlocked: false,
        isInProgress: true,
      };

      const result = generateAchievementShareContent(inProgressAchievement);

      expect(result.message).toContain("🎯 Working on:");
      expect(result.message).toContain("Progress: 0/1 (0%)");
      expect(result.message).not.toContain("Completed! 🎉");
    });

    it("should exclude URL when includeUrl option is false", () => {
      const result = generateAchievementShareContent(baseAchievement, {
        includeUrl: false,
      });

      expect(result.url).toBeUndefined();
    });

    it("should add correct hashtags based on category and title keywords", () => {
      const streakAchievement: AchievementProgress = {
        ...baseAchievement,
        achievement: {
          ...baseAchievement.achievement,
          category: "streak",
          title: "Master Chef Streak",
        },
      };

      const result = generateAchievementShareContent(streakAchievement);

      expect(result.message).toContain("#Cookkit");
      expect(result.message).toContain("#CookingStreak");
      expect(result.message).toContain("#Streak");
      expect(result.message).toContain("#Chef");
      expect(result.message).toContain("#MasterChef");
    });
  });

  describe("supportsActivityType", () => {
    let originalPlatformOS: typeof Platform.OS;

    beforeEach(() => {
      originalPlatformOS = Platform.OS;
    });

    afterEach(() => {
      Platform.OS = originalPlatformOS;
    });

    it("should return true for all activity types when OS is not iOS", () => {
      Platform.OS = "android";
      expect(supportsActivityType("com.apple.UIKit.activity.PostToTwitter")).toBe(true);
      expect(supportsActivityType("some.random.activity")).toBe(true);

      Platform.OS = "web";
      expect(supportsActivityType("com.apple.UIKit.activity.Message")).toBe(true);
    });

    it("should return true for supported iOS activity types when OS is iOS", () => {
      Platform.OS = "ios";
      expect(supportsActivityType("com.apple.UIKit.activity.PostToTwitter")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.PostToFacebook")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.PostToWeibo")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.Message")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.Mail")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.CopyToPasteboard")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.AssignToContact")).toBe(true);
    });

    it("should return false for unsupported iOS activity types when OS is iOS", () => {
      Platform.OS = "ios";
      expect(supportsActivityType("com.apple.UIKit.activity.Print")).toBe(false);
      expect(supportsActivityType("com.apple.UIKit.activity.SaveToCameraRoll")).toBe(false);
      expect(supportsActivityType("com.apple.UIKit.activity.AirDrop")).toBe(false);
      expect(supportsActivityType("random.unsupported.activity")).toBe(false);
    });
  });
});
