import { generateAchievementShareContent, generateStreakShareContent } from "../achievement-share";
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

  describe("generateStreakShareContent", () => {
    it("should generate correct content for a 3-day streak", () => {
      const result = generateStreakShareContent(3);
      expect(result.title).toBe("Cookkit - Cooking Streak Started!");
      expect(result.message).toContain("🔥 My cooking streak: 3 days!");
      expect(result.message).toContain("The journey begins! 🚀");
      expect(result.url).toBe("https://test-store-url.com");
    });

    it("should include userName when provided", () => {
      const result = generateStreakShareContent(5, { userName: "Chef Jules" });
      expect(result.message).toContain("🔥 Chef Jules's cooking streak: 5 days!");
    });

    it("should generate correct content for a 7-day streak", () => {
      const result = generateStreakShareContent(7);
      expect(result.title).toBe("Cookkit - One Week Streak!");
      expect(result.message).toContain("🔥 My cooking streak: 7 days!");
      expect(result.message).toContain("Building healthy cooking habits! 🥗");
    });

    it("should generate correct content for a 14-day streak", () => {
      const result = generateStreakShareContent(14);
      expect(result.title).toBe("Cookkit - Two Week Streak!");
      expect(result.message).toContain("👨‍🍳 My cooking streak: 14 days!");
      expect(result.message).toContain("Two weeks of cooking excellence! 💪");
    });

    it("should generate correct content for a 30-day streak", () => {
      const result = generateStreakShareContent(30);
      expect(result.title).toBe("Cookkit - Kitchen Master!");
      expect(result.message).toContain("🏆 My cooking streak: 30 days!");
      expect(result.message).toContain("A full month of delicious home cooking! 🍳");
    });

    it("should generate correct content for a 100-day streak", () => {
      const result = generateStreakShareContent(100);
      expect(result.title).toBe("Cookkit - Legendary Streak!");
      expect(result.message).toContain("🏆 My cooking streak hit 100 days! 🏆");
      expect(result.message).toContain("That's over 3 months of consistent cooking! 🔥");
    });

    it("should include new personal record message when isLongestStreak is true", () => {
      const result = generateStreakShareContent(15, { isLongestStreak: true });
      expect(result.message).toContain("🎖️ New personal record!");
    });

    it("should exclude URL when includeUrl option is false", () => {
      const result = generateStreakShareContent(5, { includeUrl: false });
      expect(result.url).toBeUndefined();
    });

    it("should correctly handle singular day message", () => {
      const result = generateStreakShareContent(1);
      expect(result.message).toContain("🔥 My cooking streak: 1 day!");
      expect(result.message).not.toContain("1 days!");
    });
  });
});
