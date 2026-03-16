/**
 * Achievement Notifications
 *
 * Provides notification templates and scheduling functions for achievements and challenges.
 * Uses the notification service for all scheduling operations.
 */

import { scheduleNotification } from "./notification-service";
import type { NotificationData } from "./notification-types";
import {
  ACHIEVEMENT_UNLOCKED_TYPE,
  CHALLENGE_COMPLETED_TYPE,
} from "./notification-handler";
import type {
  AchievementNotificationData,
  ChallengeNotificationData,
} from "~/types/achievements";

// ============================================
// Notification Types (other than achievement/challenge)
// ============================================

/**
 * Level up notification type identifier
 */
export const LEVEL_UP_NOTIFICATION_TYPE = "level_up" as const;

/**
 * Streak milestone notification type identifier
 */
export const STREAK_MILESTONE_NOTIFICATION_TYPE = "streak_milestone" as const;

// ============================================
// Notification Templates
// ============================================

/**
 * Get achievement notification title based on category
 */
function getAchievementTitle(category: string, achievementTitle: string): string {
  const titles: Record<string, string> = {
    streak: "🔥 Streak Achievement Unlocked!",
    recipes: "🍳 Recipe Milestone Reached!",
    ingredients: "🥬 Ingredient Achievement Unlocked!",
    waste: "♻️ Waste Reduction Hero!",
    social: "🎉 Social Milestone!",
  };

  return titles[category] || "🏆 Achievement Unlocked!";
}

/**
 * Get achievement notification body with details
 */
function getAchievementBody(
  achievementTitle: string,
  achievementDescription: string,
  xp?: number
): string {
  const xpText = xp ? ` (+${xp} XP)` : "";
  return `${achievementTitle}${xpText}\n${achievementDescription}`;
}

/**
 * Get challenge notification title
 */
function getChallengeTitle(): string {
  return "🎯 Challenge Complete!";
}

/**
 * Get challenge notification body with details
 */
function getChallengeBody(
  challengeTitle: string,
  xp: number,
  bonus?: string
): string {
  const bonusText = bonus ? `\nBonus: ${bonus}` : "";
  return `${challengeTitle}\n+${xp} XP${bonusText}`;
}

/**
 * Get level up notification title
 */
function getLevelUpTitle(): string {
  return "⭐ Level Up!";
}

/**
 * Get level up notification body
 */
function getLevelUpBody(newLevel: number, totalXP: number): string {
  return `You reached Level ${newLevel}!\nTotal XP: ${totalXP}`;
}

/**
 * Get streak milestone notification title
 */
function getStreakMilestoneTitle(streakDays: number): string {
  if (streakDays >= 100) return "🏆 Legendary Streak!";
  if (streakDays >= 30) return "👨‍🍳 Kitchen Master!";
  if (streakDays >= 14) return "🔥 On Fire!";
  if (streakDays >= 7) return "🔥 Heating Up!";
  return "🔥 First Flame!";
}

/**
 * Get streak milestone notification body
 */
function getStreakMilestoneBody(streakDays: number): string {
  return `${streakDays} consecutive days of cooking!\nKeep it going!`;
}

// ============================================
// Achievement Notifications
// ============================================

/**
 * Schedule an achievement unlock notification
 *
 * @param data - Achievement notification data
 * @param id - Optional notification identifier (defaults to achievement ID)
 * @returns Notification identifier
 */
export async function scheduleAchievementUnlock(
  data: AchievementNotificationData,
  id?: string
): Promise<string> {
  const notificationId = id ?? `achievement_${data.achievementId}`;

  const title = getAchievementTitle(
    data.achievementId.split("_")[0] || "general",
    data.title
  );
  const body = getAchievementBody(data.title, data.description, data.xp);

  const notificationData: NotificationData = {
    type: ACHIEVEMENT_UNLOCKED_TYPE,
    screen: "profile",
    achievementId: data.achievementId,
  };

  return scheduleNotification({
    id: notificationId,
    title,
    body,
    data: notificationData,
    trigger: { seconds: 0 }, // Immediate notification
    sound: true,
    badge: 1,
  });
}

/**
 * Schedule multiple achievement unlock notifications (e.g., for batch unlocks)
 *
 * @param achievements - Array of achievement notification data
 * @returns Array of notification identifiers
 */
export async function scheduleMultipleAchievementUnlocks(
  achievements: AchievementNotificationData[]
): Promise<string[]> {
  const promises = achievements.map((achievement) =>
    scheduleAchievementUnlock(achievement)
  );
  return Promise.all(promises);
}

// ============================================
// Challenge Notifications
// ============================================

/**
 * Schedule a challenge complete notification
 *
 * @param data - Challenge notification data
 * @param id - Optional notification identifier (defaults to challenge ID)
 * @returns Notification identifier
 */
export async function scheduleChallengeComplete(
  data: ChallengeNotificationData,
  id?: string
): Promise<string> {
  const notificationId = id ?? `challenge_${data.challengeId}`;

  const title = getChallengeTitle();
  const body = getChallengeBody(
    data.title,
    data.xp,
    data.reward?.value.toString()
  );

  const notificationData: NotificationData = {
    type: CHALLENGE_COMPLETED_TYPE,
    screen: "profile",
    challengeId: data.challengeId,
  };

  return scheduleNotification({
    id: notificationId,
    title,
    body,
    data: notificationData,
    trigger: { seconds: 0 }, // Immediate notification
    sound: true,
    badge: 1,
  });
}

/**
 * Schedule a daily challenge available notification
 *
 * @param challengeTitle - Title of the new daily challenge
 * @param challengeId - Challenge identifier
 * @returns Notification identifier
 */
export async function scheduleDailyChallengeAvailable(
  challengeTitle: string,
  challengeId: string
): Promise<string> {
  const notificationId = `daily_challenge_available_${challengeId}`;

  const notificationData: NotificationData = {
    type: "daily_challenge_available",
    screen: "profile",
    challengeId,
  };

  return scheduleNotification({
    id: notificationId,
    title: "🎯 New Daily Challenge!",
    body: `${challengeTitle}\nTap to view and accept the challenge.`,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: 1,
  });
}

/**
 * Schedule a weekly challenge available notification
 *
 * @param challengeTitle - Title of the new weekly challenge
 * @param challengeId - Challenge identifier
 * @returns Notification identifier
 */
export async function scheduleWeeklyChallengeAvailable(
  challengeTitle: string,
  challengeId: string
): Promise<string> {
  const notificationId = `weekly_challenge_available_${challengeId}`;

  const notificationData: NotificationData = {
    type: "weekly_challenge_available",
    screen: "profile",
    challengeId,
  };

  return scheduleNotification({
    id: notificationId,
    title: "🎯 New Weekly Challenge!",
    body: `${challengeTitle}\nTap to view and accept the challenge.`,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: 1,
  });
}

// ============================================
// Level Up Notifications
// ============================================

/**
 * Schedule a level up notification
 *
 * @param newLevel - The new level achieved
 * @param totalXP - Total XP earned
 * @param id - Optional notification identifier
 * @returns Notification identifier
 */
export async function scheduleLevelUp(
  newLevel: number,
  totalXP: number,
  id?: string
): Promise<string> {
  const notificationId = id ?? `level_up_${newLevel}`;

  const title = getLevelUpTitle();
  const body = getLevelUpBody(newLevel, totalXP);

  const notificationData: NotificationData = {
    type: LEVEL_UP_NOTIFICATION_TYPE,
    screen: "profile",
    newLevel: newLevel.toString(),
  };

  return scheduleNotification({
    id: notificationId,
    title,
    body,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: 1,
  });
}

// ============================================
// Streak Milestone Notifications
// ============================================

/**
 * Schedule a streak milestone notification
 *
 * @param streakDays - Current streak count
 * @param id - Optional notification identifier
 * @returns Notification identifier
 */
export async function scheduleStreakMilestone(
  streakDays: number,
  id?: string
): Promise<string> {
  const notificationId = id ?? `streak_milestone_${streakDays}`;

  const title = getStreakMilestoneTitle(streakDays);
  const body = getStreakMilestoneBody(streakDays);

  const notificationData: NotificationData = {
    type: STREAK_MILESTONE_NOTIFICATION_TYPE,
    screen: "profile",
    streakDays: streakDays.toString(),
  };

  return scheduleNotification({
    id: notificationId,
    title,
    body,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: 1,
  });
}

// ============================================
// Reminder Notifications
// ============================================

/**
 * Schedule a daily reminder to cook for streak maintenance
 *
 * @param hour - Hour to send reminder (0-23)
 * @param minute - Minute to send reminder (0-59)
 * @returns Notification identifier
 */
export async function scheduleCookingStreakReminder(
  hour: number = 18,
  minute: number = 0
): Promise<string> {
  const notificationId = "streak_reminder_daily";

  const notificationData: NotificationData = {
    type: "streak_reminder",
    screen: "index",
  };

  return scheduleNotification({
    id: notificationId,
    title: "🔥 Keep Your Streak Alive!",
    body: "Cook a recipe today to maintain your streak!",
    data: notificationData,
    trigger: { hour, minute, repeats: true },
    sound: true,
    badge: 1,
  });
}

/**
 * Schedule a challenge reminder before expiry
 *
 * @param challengeId - Challenge identifier
 * @param challengeTitle - Title of the challenge
 * @param hoursRemaining - Hours until challenge expires
 * @returns Notification identifier
 */
export async function scheduleChallengeExpiryReminder(
  challengeId: string,
  challengeTitle: string,
  hoursRemaining: number
): Promise<string> {
  const notificationId = `challenge_expiry_${challengeId}`;

  const notificationData: NotificationData = {
    type: "challenge_expiry_reminder",
    screen: "profile",
    challengeId,
  };

  const bodyText =
    hoursRemaining <= 1
      ? "Less than 1 hour remaining!"
      : `${hoursRemaining} hours remaining`;

  return scheduleNotification({
    id: notificationId,
    title: "⏰ Challenge Expiring Soon!",
    body: `${challengeTitle}\n${bodyText}`,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: 1,
  });
}

// ============================================
// Batch Notifications
// ============================================

/**
 * Schedule a batch achievement summary notification
 * Used when multiple achievements are unlocked simultaneously
 *
 * @param achievements - Array of unlocked achievement data
 * @param totalXP - Total XP earned from all achievements
 * @returns Notification identifier
 */
export async function scheduleBatchAchievementSummary(
  achievements: AchievementNotificationData[],
  totalXP: number
): Promise<string> {
  const notificationId = `batch_achievement_${Date.now()}`;

  const count = achievements.length;
  const titles = achievements.map((a) => a.title).join(", ");

  const notificationData: NotificationData = {
    type: ACHIEVEMENT_UNLOCKED_TYPE,
    screen: "profile",
    achievementIds: achievements.map((a) => a.achievementId).join(","),
  };

  return scheduleNotification({
    id: notificationId,
    title: `🏆 ${count} Achievement${count > 1 ? "s" : ""} Unlocked!`,
    body: `${titles}\nTotal: +${totalXP} XP`,
    data: notificationData,
    trigger: { seconds: 0 },
    sound: true,
    badge: count,
  });
}
