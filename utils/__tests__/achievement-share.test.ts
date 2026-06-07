import { generateMultiAchievementShareContent } from '../achievement-share';
import type { AchievementProgress } from '~/types/achievements';

// Mock dependencies that rely on react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: {
    share: jest.fn(),
  },
}), { virtual: true });

jest.mock('expo-store-review', () => ({
  storeUrl: jest.fn(() => 'https://apps.apple.com/app/cookkit'),
}), { virtual: true });

// Create a mock helper
const createMockAchievement = (
  id: string,
  title: string,
  icon: string,
  xp: number,
  isUnlocked = true
): AchievementProgress => ({
  progress: isUnlocked ? 10 : 5,
  progressPercentage: isUnlocked ? 100 : 50,
  isUnlocked,
  isLocked: !isUnlocked,
  isInProgress: !isUnlocked,
  achievement: {
    id,
    type: 'milestone',
    category: 'recipes',
    title,
    description: `Description for ${title}`,
    icon,
    requirement: {
      type: 'count',
      target: 10,
    },
    xp,
    sortOrder: 1,
    hidden: false,
  },
});

describe('generateMultiAchievementShareContent', () => {
  const mockAchievements = [
    createMockAchievement('1', 'First Recipe', '🍳', 50),
    createMockAchievement('2', 'Perfect Streak', '🔥', 100),
  ];

  it('generates content without user name correctly', () => {
    const result = generateMultiAchievementShareContent(mockAchievements);

    expect(result.title).toBe('Cookkit - Achievements Unlocked!');
    expect(result.message).toContain('🏆 Multiple Achievements Unlocked!');
    expect(result.message).toContain('I unlocked 2 achievements!');
    expect(result.message).toContain('🍳 🔥');
    expect(result.message).toContain('Total XP: +150 ⭐');
    expect(result.message).toContain('#Cookkit #AchievementUnlocked #CookingJourney');
  });

  it('generates content with user name correctly', () => {
    const result = generateMultiAchievementShareContent(mockAchievements, {
      userName: 'Chef John',
    });

    expect(result.message).toContain('Chef John unlocked 2 achievements!');
  });

  it('handles grammar correctly for a single unlocked achievement', () => {
    const singleUnlocked = [
      createMockAchievement('1', 'First Recipe', '🍳', 50, true),
      createMockAchievement('2', 'Perfect Streak', '🔥', 100, false),
    ];

    const result = generateMultiAchievementShareContent(singleUnlocked);

    // Should say "achievement" instead of "achievements"
    expect(result.message).toContain('I unlocked 1 achievement!');
    expect(result.message).not.toContain('achievements!');
  });

  it('calculates total XP correctly including zeroes', () => {
    const achievementsWithNoXp = [
      createMockAchievement('1', 'A', '🍳', 50),
      createMockAchievement('2', 'B', '🔥', 0),
    ];

    const result = generateMultiAchievementShareContent(achievementsWithNoXp);
    expect(result.message).toContain('Total XP: +50 ⭐');
  });

  it('includes URL by default', () => {
    const result = generateMultiAchievementShareContent(mockAchievements);

    expect(result.url).toBeDefined();
    expect(result.url).toContain('apple.com');
  });

  it('omits URL when includeUrl is false', () => {
    const result = generateMultiAchievementShareContent(mockAchievements, {
      includeUrl: false,
    });

    expect(result.url).toBeUndefined();
  });
});
