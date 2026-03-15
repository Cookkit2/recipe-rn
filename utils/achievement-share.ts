/**
 * Achievement Share Utilities
 *
 * Provides functions for generating shareable content for achievements.
 * Supports text-based sharing using React Native's Share API.
 */

import { Share, Platform } from "react-native";
import type { AchievementProgress } from "~/types/achievements";
import { ACHIEVEMENT_CATEGORY_DISPLAY } from "~/types/achievements";

// ============================================
// Types
// ============================================

/**
 * Result of a share operation
 */
export interface ShareResult {
  action: "shared" | "dismissed";
  activityType?: string;
}

/**
 * Share content for an achievement
 */
export interface AchievementShareContent {
  title: string;
  message: string;
  url?: string;
}

// ============================================
// Content Generation
// ============================================

/**
 * Get the app name for sharing
 */
function getAppName(): string {
  return "Cookkit";
}

/**
 * Get app store URL (placeholder for future use)
 */
function getAppStoreUrl(): string {
  // TODO: Replace with actual app store URL when available
  return "https://cookkit.app";
}

/**
 * Format achievement share text with emojis and details
 */
function formatAchievementText(achievement: AchievementProgress, userName?: string): string {
  const { achievement: ach, progress, progressPercentage, isUnlocked } = achievement;

  // Header with emoji
  const header = isUnlocked ? "🏆 Achievement Unlocked!" : "🎯 Working on:";

  // User name if provided
  const userLine = userName ? `${userName} just ` : "I just ";

  // Achievement icon and title
  const iconTitle = `${ach.icon} ${ach.title}`;

  // Progress or completion message
  let progressLine = "";
  if (isUnlocked) {
    progressLine = `Completed! 🎉`;
  } else if (ach.requirement.metric) {
    const target = ach.requirement.target;
    progressLine = `Progress: ${progress}/${target} (${Math.round(progressPercentage)}%)`;
  }

  // XP reward if applicable
  const xpLine = ach.xp ? `+${ach.xp} XP earned! ⭐` : "";

  // Category display
  const categoryInfo = ACHIEVEMENT_CATEGORY_DISPLAY[ach.category];
  const categoryLine = categoryInfo.icon + " " + categoryInfo.title;

  // Build the share message
  const lines = [
    header,
    "",
    `${userLine}${iconTitle}`,
    ach.description,
    progressLine,
    xpLine,
    "",
    `${categoryLine} on ${getAppName()}`,
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * Format hashtag list for the achievement
 */
function formatHashtags(achievement: AchievementProgress): string {
  const tags: string[] = [];

  // App hashtag
  tags.push("#Cookkit");

  // Category hashtags
  const categoryHashtags: Record<string, string> = {
    streak: "#CookingStreak",
    recipes: "#HomeCooking",
    ingredients: "#IngredientTracker",
    waste: "#ZeroWaste",
    social: "#CookingCommunity",
  };
  tags.push(categoryHashtags[achievement.achievement.category] || "#Achievement");

  // Add specific tags based on achievement
  const title = achievement.achievement.title.toLowerCase();
  if (title.includes("streak")) tags.push("#Streak");
  if (title.includes("recipe")) tags.push("#Recipe");
  if (title.includes("chef")) tags.push("#Chef");
  if (title.includes("master")) tags.push("#MasterChef");

  return tags.join(" ");
}

/**
 * Generate shareable content for an achievement
 */
export function generateAchievementShareContent(
  achievement: AchievementProgress,
  options?: {
    userName?: string;
    includeUrl?: boolean;
  }
): AchievementShareContent {
  const { userName, includeUrl = true } = options ?? {};

  const message = formatAchievementText(achievement, userName);
  const hashtags = formatHashtags(achievement);
  const fullMessage = `${message}\n\n${hashtags}`;

  return {
    title: `${getAppName()} - ${achievement.achievement.title}`,
    message: fullMessage,
    url: includeUrl ? getAppStoreUrl() : undefined,
  };
}

/**
 * Generate shareable content for multiple achievements
 */
export function generateMultiAchievementShareContent(
  achievements: AchievementProgress[],
  options?: {
    userName?: string;
    includeUrl?: boolean;
  }
): AchievementShareContent {
  const { userName, includeUrl = true } = options ?? {};

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalXP = achievements.reduce((sum, a) => sum + (a.achievement.xp || 0), 0);

  const userPrefix = userName ? `${userName} ` : "I ";
  const icons = achievements.map((a) => a.achievement.icon).join(" ");

  const lines = [
    "🏆 Multiple Achievements Unlocked!",
    "",
    `${userPrefix}unlocked ${unlockedCount} achievement${unlockedCount > 1 ? "s" : ""}!`,
    icons,
    `Total XP: +${totalXP} ⭐`,
    "",
    `Keep it going on ${getAppName()}!`,
    "",
    "#Cookkit #AchievementUnlocked #CookingJourney",
  ];

  return {
    title: `${getAppName()} - Achievements Unlocked!`,
    message: lines.join("\n"),
    url: includeUrl ? getAppStoreUrl() : undefined,
  };
}

/**
 * Generate shareable content for a streak milestone
 */
export function generateStreakShareContent(
  streakDays: number,
  options?: {
    userName?: string;
    includeUrl?: boolean;
    isLongestStreak?: boolean;
  }
): AchievementShareContent {
  const { userName, includeUrl = true, isLongestStreak } = options ?? {};

  const userPrefix = userName ? `${userName}'s ` : "My ";
  const streakEmoji = streakDays >= 30 ? "🏆" : streakDays >= 14 ? "👨‍🍳" : "🔥";

  let title = "";
  let message = "";

  if (streakDays >= 100) {
    title = "Legendary Streak!";
    message = `${streakEmoji} ${userPrefix}cooking streak hit ${streakDays} days! 🏆\n\nThat's over 3 months of consistent cooking! 🔥`;
  } else if (streakDays >= 30) {
    title = "Kitchen Master!";
    message = `${streakEmoji} ${userPrefix}cooking streak: ${streakDays} days!\n\nA full month of delicious home cooking! 🍳`;
  } else if (streakDays >= 14) {
    title = "Two Week Streak!";
    message = `${streakEmoji} ${userPrefix}cooking streak: ${streakDays} days!\n\nTwo weeks of cooking excellence! 💪`;
  } else if (streakDays >= 7) {
    title = "One Week Streak!";
    message = `${streakEmoji} ${userPrefix}cooking streak: ${streakDays} days!\n\nBuilding healthy cooking habits! 🥗`;
  } else {
    title = "Cooking Streak Started!";
    message = `${streakEmoji} ${userPrefix}cooking streak: ${streakDays} day${streakDays > 1 ? "s" : ""}!\n\nThe journey begins! 🚀`;
  }

  if (isLongestStreak) {
    message += "\n\n🎖️ New personal record!";
  }

  message += `\n\nKeep it going on ${getAppName()}!`;
  message += "\n\n#Cookkit #CookingStreak #HomeCooking";

  return {
    title: `${getAppName()} - ${title}`,
    message,
    url: includeUrl ? getAppStoreUrl() : undefined,
  };
}

// ============================================
// Share Actions
// ============================================

/**
 * Share an achievement using the native share sheet
 *
 * @param achievement - The achievement to share
 * @param options - Optional configuration
 * @returns Promise with share result
 */
export async function shareAchievement(
  achievement: AchievementProgress,
  options?: {
    userName?: string;
    includeUrl?: boolean;
    dialogTitle?: string;
  }
): Promise<ShareResult> {
  const content = generateAchievementShareContent(achievement, options);

  try {
    const result = await Share.share(
      {
        title: content.title,
        message: content.message,
        url: content.url,
      },
      {
        dialogTitle: options?.dialogTitle || "Share Achievement",
        subject: content.title, // For email
      }
    );

    const action: "shared" | "dismissed" =
      result.action === "sharedAction" ? "shared" : "dismissed";
    return {
      action,
      activityType: result.activityType || undefined,
    };
  } catch (error) {
    // User cancelled the share sheet - this is expected behavior
    if (error instanceof Error && error.message.includes("cancelled")) {
      return { action: "dismissed" };
    }
    // Log other errors but don't throw
    throw error;
  }
}

/**
 * Share multiple achievements
 */
export async function shareMultipleAchievements(
  achievements: AchievementProgress[],
  options?: {
    userName?: string;
    includeUrl?: boolean;
    dialogTitle?: string;
  }
): Promise<ShareResult> {
  if (achievements.length === 0) {
    throw new Error("At least one achievement is required");
  }

  const content = generateMultiAchievementShareContent(achievements, options);

  try {
    const result = await Share.share(
      {
        title: content.title,
        message: content.message,
        url: content.url,
      },
      {
        dialogTitle: options?.dialogTitle || "Share Achievements",
        subject: content.title,
      }
    );

    const action: "shared" | "dismissed" =
      result.action === "sharedAction" ? "shared" : "dismissed";
    return {
      action,
      activityType: result.activityType || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("cancelled")) {
      return { action: "dismissed" };
    }
    throw error;
  }
}

/**
 * Share a streak milestone
 */
export async function shareStreak(
  streakDays: number,
  options?: {
    userName?: string;
    includeUrl?: boolean;
    dialogTitle?: string;
    isLongestStreak?: boolean;
  }
): Promise<ShareResult> {
  const content = generateStreakShareContent(streakDays, options);

  try {
    const result = await Share.share(
      {
        title: content.title,
        message: content.message,
        url: content.url,
      },
      {
        dialogTitle: options?.dialogTitle || "Share Streak",
        subject: content.title,
      }
    );

    const action: "shared" | "dismissed" =
      result.action === "sharedAction" ? "shared" : "dismissed";
    return {
      action,
      activityType: result.activityType || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("cancelled")) {
      return { action: "dismissed" };
    }
    throw error;
  }
}

/**
 * Check if sharing is available on the current platform
 */
export async function isShareAvailable(): Promise<boolean> {
  // Share API is available on iOS and Android
  // On web, it may not be available in all browsers
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * Share content with custom message (generic helper)
 */
export async function shareContent(
  content: AchievementShareContent,
  options?: {
    dialogTitle?: string;
  }
): Promise<ShareResult> {
  try {
    const result = await Share.share(
      {
        title: content.title,
        message: content.message,
        url: content.url,
      },
      {
        dialogTitle: options?.dialogTitle || "Share",
        subject: content.title,
      }
    );

    const action: "shared" | "dismissed" =
      result.action === "sharedAction" ? "shared" : "dismissed";
    return {
      action,
      activityType: result.activityType || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("cancelled")) {
      return { action: "dismissed" };
    }
    throw error;
  }
}

// ============================================
// Share Intent Helpers
// ============================================

/**
 * Get share text for copying to clipboard (if share sheet is not used)
 */
export function getShareTextForCopy(achievement: AchievementProgress, userName?: string): string {
  const content = generateAchievementShareContent(achievement, { userName });
  return [content.title, content.message, content.url].filter(Boolean).join("\n\n");
}

/**
 * Generate achievement share URL (for deep linking to specific achievement)
 */
export function getAchievementShareUrl(achievementId: string): string {
  return `https://cookkit.app/achievement/${achievementId}`;
}

// ============================================
// Platform-Specific Helpers
// ============================================

/**
 * Get platform-specific share options
 */
export function getPlatformShareOptions(): {
  dialogTitle: string;
  subject?: string;
} {
  if (Platform.OS === "ios") {
    return {
      dialogTitle: "Share",
    };
  }
  return {
    dialogTitle: "Share Achievement",
    subject: "Cookkit Achievement",
  };
}

/**
 * Check if the platform supports a specific activity type
 * iOS only - returns true for other platforms
 */
export function supportsActivityType(activityType: string): boolean {
  if (Platform.OS !== "ios") {
    return true;
  }

  // Common iOS activity types
  const supportedTypes = [
    "com.apple.UIKit.activity.PostToTwitter",
    "com.apple.UIKit.activity.PostToFacebook",
    "com.apple.UIKit.activity.PostToWeibo",
    "com.apple.UIKit.activity.Message",
    "com.apple.UIKit.activity.Mail",
    "com.apple.UIKit.activity.CopyToPasteboard",
    "com.apple.UIKit.activity.AssignToContact",
  ];

  return supportedTypes.includes(activityType);
}
