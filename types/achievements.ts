// Achievement Categories
export const ACHIEVEMENT_CATEGORIES = ['streak', 'recipes', 'ingredients', 'waste', 'social'] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

// Achievement Types
export const ACHIEVEMENT_TYPES = ['milestone', 'streak', 'cumulative', 'special'] as const;
export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

// Achievement Status
export const ACHIEVEMENT_STATUSES = ['locked', 'unlocked', 'in_progress'] as const;
export type AchievementStatus = (typeof ACHIEVEMENT_STATUSES)[number];

// Challenge Types
export const CHALLENGE_TYPES = ['daily', 'weekly'] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

// Challenge Status
export const CHALLENGE_STATUSES = ['available', 'active', 'completed', 'expired'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

// Achievement Reward Types
export const REWARD_TYPES = ['badge', 'title', 'theme', 'recipe'] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

// Core Achievement Interface
export interface Achievement {
  id: string;
  type: AchievementType;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string; // Emoji or icon name
  requirement: AchievementRequirement;
  reward?: AchievementReward;
  xp?: number;
  sortOrder: number;
  hidden?: boolean; // Hidden until unlocked
}

// Achievement Requirement Definition
export interface AchievementRequirement {
  type: 'streak' | 'count' | 'cumulative' | 'date' | 'special';
  target: number;
  metric?: string; // e.g., 'recipes_cooked', 'ingredients_tracked', 'consecutive_days'
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

// Achievement Reward
export interface AchievementReward {
  type: RewardType;
  value: string;
  description?: string;
}

// User Achievement Progress
export interface UserAchievement {
  id: string;
  achievementId: string;
  status: AchievementStatus;
  progress: number;
  unlockedAt?: Date;
  lastCheckedAt: Date;
}

// Challenge Interface
export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  requirement: ChallengeRequirement;
  reward: ChallengeReward;
  startDate: Date;
  endDate: Date;
  xp?: number;
}

// Challenge Requirement
export interface ChallengeRequirement {
  type: 'cook_recipes' | 'use_ingredients' | 'try_new_recipe' | 'reduce_waste' | 'cook_category';
  target: number;
  description: string;
  constraints?: {
    recipeCategory?: string[];
    ingredientTypes?: string[];
    excludeCompleted?: boolean;
  };
}

// Challenge Reward
export interface ChallengeReward {
  xp: number;
  bonus?: {
    type: 'streak_freeze' | 'xp_multiplier' | 'unlock_badge';
    value: number | string;
  };
}

// User Challenge Progress
export interface UserChallenge {
  id: string;
  challengeId: string;
  status: ChallengeStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  claimedAt?: Date;
}

// Streak Information
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCookingDate?: Date;
  streakHistory: StreakEntry[];
}

export interface StreakEntry {
  date: Date;
  streakCount: number;
}

// Achievement Progress for UI
export interface AchievementProgress {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress: number;
  progressPercentage: number;
  isUnlocked: boolean;
  isLocked: boolean;
  isInProgress: boolean;
  nextMilestone?: {
    target: number;
    current: number;
    remaining: number;
  };
}

// Challenge Progress for UI
export interface ChallengeProgress {
  challenge: Challenge;
  userChallenge?: UserChallenge;
  progress: number;
  progressPercentage: number;
  isActive: boolean;
  isCompleted: boolean;
  isExpired: boolean;
  isAvailable: boolean;
  timeRemaining?: number; // milliseconds until expiry
}

// Gamification Profile Summary
export interface GamificationProfile {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  activeChallenges: number;
  completedChallenges: number;
}

// Achievement Notification Data
export interface AchievementNotificationData {
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  xp?: number;
  reward?: AchievementReward;
}

// Challenge Notification Data
export interface ChallengeNotificationData {
  challengeId: string;
  title: string;
  description: string;
  xp: number;
  reward?: ChallengeReward['bonus'];
}

// Achievement Share Data (for social sharing)
export interface AchievementShareData {
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  userName?: string;
  streakInfo?: {
    current: number;
    longest: number;
  };
}

// Achievement Category Display Info
export interface AchievementCategoryDisplay {
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// Predefined Achievement Category Display Constants
export const ACHIEVEMENT_CATEGORY_DISPLAY: Record<AchievementCategory, AchievementCategoryDisplay> = {
  streak: {
    category: 'streak',
    title: 'Cooking Streaks',
    description: 'Maintain consecutive cooking days',
    icon: '🔥',
    color: '#FF6B35',
  },
  recipes: {
    category: 'recipes',
    title: 'Recipe Milestones',
    description: 'Cook and discover new recipes',
    icon: '🍳',
    color: '#4ECDC4',
  },
  ingredients: {
    category: 'ingredients',
    title: 'Ingredient Tracker',
    description: 'Track and manage ingredients',
    icon: '🥬',
    color: '#95E1D3',
  },
  waste: {
    category: 'waste',
    title: 'Waste Reduction',
    description: 'Reduce food waste',
    icon: '♻️',
    color: '#A8E6CF',
  },
  social: {
    category: 'social',
    title: 'Social Sharing',
    description: 'Share your cooking journey',
    icon: '🎉',
    color: '#FFD93D',
  },
};

// XP Level Thresholds
export const XP_LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000] as const;

// Helper function to get level from XP
export const getLevelFromXP = (xp: number): number => {
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = XP_LEVEL_THRESHOLDS[i];
    if (xp >= threshold) {
      return i + 1;
    }
  }
  return 1;
};

// Helper function to get XP required for next level
export const getXPForNextLevel = (currentLevel: number): number => {
  const nextLevelIndex = currentLevel; // levels are 1-indexed
  if (nextLevelIndex < 0) {
    return XP_LEVEL_THRESHOLDS[0];
  }
  if (nextLevelIndex >= XP_LEVEL_THRESHOLDS.length) {
    return XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1];
  }
  return XP_LEVEL_THRESHOLDS[nextLevelIndex];
};
