import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { generateStreakShareContent } from "../achievement-share";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

// Mock react-native Platform
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
  Share: {
    share: jest.fn(),
  },
}));

// Mock expo-store-review
jest.mock("expo-store-review", () => ({
  storeUrl: jest.fn(),
}));

describe("generateStreakShareContent", () => {
  const APP_NAME = "Cookkit";
  const IOS_STORE_URL = "https://apps.apple.com/us/app/cookkit/id6752543191";
  const WEB_URL = "https://cookkit.app";

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
    (StoreReview.storeUrl as jest.Mock).mockReturnValue(undefined);
  });

  it("generates correct content for Legendary Streak (>= 100 days)", () => {
    const result = generateStreakShareContent(100);

    expect(result.title).toBe(`${APP_NAME} - Legendary Streak!`);
    expect(result.message).toContain("🏆 My cooking streak hit 100 days! 🏆");
    expect(result.message).toContain("over 3 months of consistent cooking! 🔥");
    expect(result.message).toContain(`#${APP_NAME} #CookingStreak #HomeCooking`);
    expect(result.url).toBe(IOS_STORE_URL); // iOS default
  });

  it("generates correct content for Kitchen Master (>= 30 days)", () => {
    const result = generateStreakShareContent(30);

    expect(result.title).toBe(`${APP_NAME} - Kitchen Master!`);
    expect(result.message).toContain("🏆 My cooking streak: 30 days!");
    expect(result.message).toContain("A full month of delicious home cooking! 🍳");
  });

  it("generates correct content for Two Week Streak (>= 14 days)", () => {
    const result = generateStreakShareContent(14);

    expect(result.title).toBe(`${APP_NAME} - Two Week Streak!`);
    expect(result.message).toContain("👨‍🍳 My cooking streak: 14 days!");
    expect(result.message).toContain("Two weeks of cooking excellence! 💪");
  });

  it("generates correct content for One Week Streak (>= 7 days)", () => {
    const result = generateStreakShareContent(7);

    expect(result.title).toBe(`${APP_NAME} - One Week Streak!`);
    expect(result.message).toContain("🔥 My cooking streak: 7 days!");
    expect(result.message).toContain("Building healthy cooking habits! 🥗");
  });

  it("generates correct content for Cooking Streak Started (< 7 days)", () => {
    const result = generateStreakShareContent(3);

    expect(result.title).toBe(`${APP_NAME} - Cooking Streak Started!`);
    expect(result.message).toContain("🔥 My cooking streak: 3 days!");
    expect(result.message).toContain("The journey begins! 🚀");
  });

  it("handles 1 day properly (no plural 'days')", () => {
    const result = generateStreakShareContent(1);

    expect(result.title).toBe(`${APP_NAME} - Cooking Streak Started!`);
    expect(result.message).toContain("🔥 My cooking streak: 1 day!"); // not days!
  });

  it("includes userName when provided", () => {
    const result = generateStreakShareContent(10, { userName: "Chef John" });

    expect(result.message).toContain("🔥 Chef John's cooking streak: 10 days!");
  });

  it("includes personal record message when isLongestStreak is true", () => {
    const result = generateStreakShareContent(50, { isLongestStreak: true });

    expect(result.message).toContain("🎖️ New personal record!");
  });

  it("omits url when includeUrl is false", () => {
    const result = generateStreakShareContent(5, { includeUrl: false });

    expect(result.url).toBeUndefined();
  });

  it("uses expo-store-review url if available", () => {
    const mockStoreUrl = "https://custom-store-url.com";
    (StoreReview.storeUrl as jest.Mock).mockReturnValue(mockStoreUrl);

    const result = generateStreakShareContent(5);

    expect(result.url).toBe(mockStoreUrl);
  });

  it("falls back to web url when platform is not ios", () => {
    Platform.OS = "android";
    const result = generateStreakShareContent(5);

    expect(result.url).toBe(WEB_URL);
  });
});
