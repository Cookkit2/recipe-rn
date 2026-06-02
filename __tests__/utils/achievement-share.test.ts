import {
  generateAchievementShareContent,
  generateMultiAchievementShareContent,
  generateStreakShareContent,
  getShareTextForCopy,
  getAchievementShareUrl,
} from "../../utils/achievement-share";
import type { AchievementProgress } from "../../types/achievements";

// Mock StoreReview and Platform
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Share: {
    share: jest.fn(),
  },
}));

jest.mock("expo-store-review", () => ({
  storeUrl: jest.fn(() => "https://apps.apple.com/app/id123456789"),
}));

const mockAchievement: AchievementProgress = {
  achievement: {
    id: "test-1",
    type: "milestone",
    category: "streak",
    title: "10 Day Streak",
    description: "You cooked 10 days in a row!",
    icon: "🔥",
    requirement: {
      type: "streak",
      target: 10,
      metric: "consecutive_days",
    },
    xp: 50,
    sortOrder: 1,
  },
  progress: 10,
  progressPercentage: 100,
  isUnlocked: true,
  isLocked: false,
  isInProgress: false,
};

describe("Achievement Share Utilities", () => {
  describe("generateAchievementShareContent", () => {
    it("generates correct content for an unlocked achievement", () => {
      const result = generateAchievementShareContent(mockAchievement, { userName: "John" });

      expect(result.title).toBe("Cookkit - 10 Day Streak");
      expect(result.message).toContain("John just 🔥 10 Day Streak");
      expect(result.message).toContain("Completed! 🎉");
      expect(result.message).toContain("+50 XP earned! ⭐");
      expect(result.message).toContain("#Cookkit #CookingStreak #Streak");
      expect(result.url).toBe("https://apps.apple.com/app/id123456789");
    });

    it("generates correct content for an achievement in progress", () => {
      const inProgressAchievement = {
        ...mockAchievement,
        progress: 5,
        progressPercentage: 50,
        isUnlocked: false,
        isInProgress: true,
      };

      const result = generateAchievementShareContent(inProgressAchievement);

      expect(result.message).toContain("I just 🔥 10 Day Streak");
      expect(result.message).toContain("Progress: 5/10 (50%)");
      expect(result.message).not.toContain("Completed! 🎉");
    });
  });

  describe("generateMultiAchievementShareContent", () => {
    it("generates correct content for multiple achievements", () => {
      const mockAch2 = {
        ...mockAchievement,
        achievement: { ...mockAchievement.achievement, id: "test-2", icon: "🍳", xp: 100 },
      };

      const result = generateMultiAchievementShareContent([mockAchievement, mockAch2], {
        userName: "Jane",
      });

      expect(result.title).toBe("Cookkit - Achievements Unlocked!");
      expect(result.message).toContain("Jane unlocked 2 achievements!");
      expect(result.message).toContain("🔥 🍳");
      expect(result.message).toContain("Total XP: +150 ⭐");
    });
  });

  describe("generateStreakShareContent", () => {
    it("generates correct content for a new personal record streak", () => {
      const result = generateStreakShareContent(15, { userName: "Alex", isLongestStreak: true });

      expect(result.title).toBe("Cookkit - Two Week Streak!");
      expect(result.message).toContain("Alex's cooking streak: 15 days!");
      expect(result.message).toContain("Two weeks of cooking excellence!");
      expect(result.message).toContain("🎖️ New personal record!");
      expect(result.message).toContain("#Cookkit #CookingStreak #HomeCooking");
    });
  });

  describe("Helper Functions", () => {
    it("getShareTextForCopy generates proper string", () => {
      const text = getShareTextForCopy(mockAchievement, "Sam");
      expect(text).toContain("Cookkit - 10 Day Streak");
      expect(text).toContain("Sam just 🔥 10 Day Streak");
      expect(text).toContain("https://apps.apple.com/app/id123456789");
    });

    it("getAchievementShareUrl generates proper URL", () => {
      const url = getAchievementShareUrl("test-id-123");
      expect(url).toBe("https://cookkit.app/achievement/test-id-123");
    });
  });
});

describe("share actions", () => {
  const { Share } = require("react-native");
  const {
    shareAchievement,
    shareMultipleAchievements,
    shareStreak,
    shareContent,
    isShareAvailable,
    getPlatformShareOptions,
    supportsActivityType,
  } = require("../../utils/achievement-share");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shareAchievement calls Share.share correctly", async () => {
    Share.share.mockResolvedValueOnce({
      action: "sharedAction",
      activityType: "com.apple.UIKit.activity.PostToTwitter",
    });
    const result = await shareAchievement(mockAchievement, { dialogTitle: "Custom Title" });
    expect(Share.share).toHaveBeenCalled();
    expect(result.action).toBe("shared");
    expect(result.activityType).toBe("com.apple.UIKit.activity.PostToTwitter");
  });

  it("shareAchievement handles dismissal", async () => {
    Share.share.mockResolvedValueOnce({ action: "dismissedAction" });
    const result = await shareAchievement(mockAchievement);
    expect(result.action).toBe("dismissed");
  });

  it("shareAchievement handles cancellation errors gracefully", async () => {
    Share.share.mockRejectedValueOnce(new Error("User cancelled"));
    const result = await shareAchievement(mockAchievement);
    expect(result.action).toBe("dismissed");
  });

  it("shareAchievement throws on other errors", async () => {
    Share.share.mockRejectedValueOnce(new Error("Some other error"));
    await expect(shareAchievement(mockAchievement)).rejects.toThrow("Some other error");
  });

  it("shareMultipleAchievements requires at least one achievement", async () => {
    await expect(shareMultipleAchievements([])).rejects.toThrow(
      "At least one achievement is required"
    );
  });

  it("isShareAvailable returns a boolean", async () => {
    const result = await isShareAvailable();
    expect(typeof result).toBe("boolean");
  });

  it("getPlatformShareOptions returns correct options for iOS", () => {
    const { Platform } = require("react-native");
    Platform.OS = "ios";
    const options = getPlatformShareOptions();
    expect(options.dialogTitle).toBe("Share");
    expect(options.subject).toBeUndefined();
  });

  it("supportsActivityType handles iOS specific types", () => {
    const { Platform } = require("react-native");
    Platform.OS = "ios";
    expect(supportsActivityType("com.apple.UIKit.activity.PostToTwitter")).toBe(true);
    expect(supportsActivityType("unknown.type")).toBe(false);

    Platform.OS = "android";
    expect(supportsActivityType("unknown.type")).toBe(true); // always true on non-iOS
    Platform.OS = "ios"; // reset
  });
});

describe("More branch coverage for generateStreakShareContent", () => {
  it("handles Legendary Streak (100+ days)", () => {
    const result = generateStreakShareContent(100);
    expect(result.title).toBe("Cookkit - Legendary Streak!");
    expect(result.message).toContain("100 days");
  });

  it("handles Kitchen Master (30+ days)", () => {
    const result = generateStreakShareContent(30);
    expect(result.title).toBe("Cookkit - Kitchen Master!");
    expect(result.message).toContain("30 days");
  });

  it("handles One Week Streak (7+ days)", () => {
    const result = generateStreakShareContent(7);
    expect(result.title).toBe("Cookkit - One Week Streak!");
    expect(result.message).toContain("7 days");
  });

  it("handles Cooking Streak Started (1 day)", () => {
    const result = generateStreakShareContent(1);
    expect(result.title).toBe("Cookkit - Cooking Streak Started!");
    expect(result.message).toContain("1 day!"); // singular
  });
});

describe("More branch coverage for share actions", () => {
  const { Share } = require("react-native");
  const {
    shareMultipleAchievements,
    shareStreak,
    shareContent,
    getPlatformShareOptions,
  } = require("../../utils/achievement-share");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shareMultipleAchievements calls Share.share correctly", async () => {
    Share.share.mockResolvedValueOnce({ action: "sharedAction", activityType: "test" });
    const result = await shareMultipleAchievements([mockAchievement]);
    expect(Share.share).toHaveBeenCalled();
    expect(result.action).toBe("shared");
  });

  it("shareMultipleAchievements handles errors", async () => {
    Share.share.mockRejectedValueOnce(new Error("User cancelled"));
    const result = await shareMultipleAchievements([mockAchievement]);
    expect(result.action).toBe("dismissed");

    Share.share.mockRejectedValueOnce(new Error("Unknown"));
    await expect(shareMultipleAchievements([mockAchievement])).rejects.toThrow("Unknown");
  });

  it("shareStreak calls Share.share correctly", async () => {
    Share.share.mockResolvedValueOnce({ action: "sharedAction", activityType: "test" });
    const result = await shareStreak(5);
    expect(Share.share).toHaveBeenCalled();
    expect(result.action).toBe("shared");
  });

  it("shareStreak handles errors", async () => {
    Share.share.mockRejectedValueOnce(new Error("User cancelled"));
    const result = await shareStreak(5);
    expect(result.action).toBe("dismissed");

    Share.share.mockRejectedValueOnce(new Error("Unknown"));
    await expect(shareStreak(5)).rejects.toThrow("Unknown");
  });

  it("shareContent calls Share.share correctly", async () => {
    Share.share.mockResolvedValueOnce({ action: "sharedAction", activityType: "test" });
    const result = await shareContent({ title: "t", message: "m" });
    expect(Share.share).toHaveBeenCalled();
    expect(result.action).toBe("shared");
  });

  it("shareContent handles errors", async () => {
    Share.share.mockRejectedValueOnce(new Error("User cancelled"));
    const result = await shareContent({ title: "t", message: "m" });
    expect(result.action).toBe("dismissed");

    Share.share.mockRejectedValueOnce(new Error("Unknown"));
    await expect(shareContent({ title: "t", message: "m" })).rejects.toThrow("Unknown");
  });

  it("getPlatformShareOptions handles Android", () => {
    const { Platform } = require("react-native");
    Platform.OS = "android";
    const options = getPlatformShareOptions();
    expect(options.dialogTitle).toBe("Share Achievement");
    expect(options.subject).toBe("Cookkit Achievement");
    Platform.OS = "ios"; // restore
  });
});

describe("Fallback URL (Android)", () => {
  it("getAppStoreUrl falls back to android URL when Platform.OS is android", () => {
    const { Platform } = require("react-native");
    Platform.OS = "android";
    const { storeUrl } = require("expo-store-review");
    storeUrl.mockReturnValueOnce(null); // Force fallback

    const { generateAchievementShareContent } = require("../../utils/achievement-share");
    const result = generateAchievementShareContent(mockAchievement);
    expect(result.url).toBe("https://cookkit.app");

    Platform.OS = "ios"; // restore
  });
});

describe("Fallback URL (iOS StoreReview absent)", () => {
  it("getAppStoreUrl falls back to iOS App Store URL when storeUrl() returns null on iOS", () => {
    const { Platform } = require("react-native");
    Platform.OS = "ios";
    const { storeUrl } = require("expo-store-review");
    storeUrl.mockReturnValueOnce(null); // Force fallback to hardcoded iOS URL

    const { generateAchievementShareContent } = require("../../utils/achievement-share");
    const result = generateAchievementShareContent(mockAchievement);
    expect(result.url).toBe("https://apps.apple.com/us/app/cookkit/id6752543191");
  });
});

describe("Branch coverage for formatHashtags", () => {
  it("adds #Recipe when title includes recipe", () => {
    const mock = {
      ...mockAchievement,
      achievement: { ...mockAchievement.achievement, title: "First Recipe", category: "recipes" },
    };
    const content = generateAchievementShareContent(mock as any);
    expect(content.message).toContain("#HomeCooking");
    expect(content.message).toContain("#Recipe");
  });

  it("adds #Chef when title includes chef", () => {
    const mock = {
      ...mockAchievement,
      achievement: { ...mockAchievement.achievement, title: "Sous Chef", category: "ingredients" },
    };
    const content = generateAchievementShareContent(mock as any);
    expect(content.message).toContain("#IngredientTracker");
    expect(content.message).toContain("#Chef");
  });

  it("adds #MasterChef when title includes master", () => {
    const mock = {
      ...mockAchievement,
      achievement: { ...mockAchievement.achievement, title: "Grill Master", category: "waste" },
    };
    const content = generateAchievementShareContent(mock as any);
    expect(content.message).toContain("#ZeroWaste");
    expect(content.message).toContain("#MasterChef");
  });

  it("adds default #Achievement for unknown category", () => {
    // Create an unknown category but mock the formatAchievementText so it doesn't crash on undefined categoryInfo
    const { generateAchievementShareContent } = require("../../utils/achievement-share");

    // Override the ACHIEVEMENT_CATEGORY_DISPLAY temporarily if possible,
    // but easier is just using a valid category for the formatAchievementText
    // and checking the hashtag logic independently.
    // Wait, formatHashtags uses the category directly:
    // tags.push(categoryHashtags[achievement.achievement.category] || "#Achievement");

    // Since ACHIEVEMENT_CATEGORY_DISPLAY is used in formatAchievementText, we'll mock it
    // or just use a category that exists in ACHIEVEMENT_CATEGORY_DISPLAY but NOT in categoryHashtags.
    // But all ACHIEVEMENT_CATEGORIES are in categoryHashtags.
    // Let's mock the category info just for this test.

    const achievements = require("../../types/achievements");
    const originalDisplay = achievements.ACHIEVEMENT_CATEGORY_DISPLAY;
    achievements.ACHIEVEMENT_CATEGORY_DISPLAY = {
      ...originalDisplay,
      unknown: { icon: "❓", title: "Unknown", category: "unknown", description: "", color: "" },
    };

    const mock = {
      ...mockAchievement,
      achievement: { ...mockAchievement.achievement, title: "Unknown", category: "unknown" },
    };
    const result = generateAchievementShareContent(mock as any);
    expect(result.message).toContain("#Achievement");

    // Restore
    achievements.ACHIEVEMENT_CATEGORY_DISPLAY = originalDisplay;
  });
});

describe("Branch coverage for generateMultiAchievementShareContent", () => {
  it("uses default values when options omitted", () => {
    const { generateMultiAchievementShareContent } = require("../../utils/achievement-share");
    const result = generateMultiAchievementShareContent([mockAchievement]);
    expect(result.message).toContain("I unlocked 1 achievement!");
  });

  it("handles zero XP achievements gracefully", () => {
    const { generateMultiAchievementShareContent } = require("../../utils/achievement-share");
    const mock = {
      ...mockAchievement,
      achievement: { ...mockAchievement.achievement, xp: undefined },
    };
    const result = generateMultiAchievementShareContent([mock]);
    expect(result.message).toContain("Total XP: +0 ⭐");
  });
});
