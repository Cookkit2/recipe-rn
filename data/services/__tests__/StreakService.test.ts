// Mock CookingHistoryRepository
const mockGetCookingHistory = jest.fn();

jest.mock("../../db/repositories/CookingHistoryRepository", () => ({
  CookingHistoryRepository: jest.fn().mockImplementation(() => ({
    getCookingHistory: mockGetCookingHistory,
  })),
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

import { streakService } from "../StreakService";

describe("StreakService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateCurrentStreak", () => {
    it("should return 0 when no cooking history exists", async () => {
      mockGetCookingHistory.mockResolvedValue([]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(0);
    });

    it("should return 1 for a single cooking session", async () => {
      const today = new Date();
      mockGetCookingHistory.mockResolvedValue([
        {
          id: "1",
          recipeId: "recipe-1",
          cookedAtDate: today,
        },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(1);
    });

    it("should calculate streak from consecutive daily cooking", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(yesterday);
      dayBefore.setDate(dayBefore.getDate() - 1);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
        { id: "2", recipeId: "recipe-2", cookedAtDate: yesterday },
        { id: "3", recipeId: "recipe-3", cookedAtDate: dayBefore },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(3);
    });

    it("should return 0 when last cooking was more than 1 day ago", async () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: threeDaysAgo },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(0);
    });

    it("should count streak correctly when cooked today and yesterday", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
        { id: "2", recipeId: "recipe-2", cookedAtDate: yesterday },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(2);
    });

    it("should handle multiple cooking sessions on the same day", async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: new Date(today) },
        { id: "3", recipeId: "recipe-3", cookedAtDate: new Date(yesterday) },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(2);
    });

    it("should break streak when there's a gap in cooking", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
        { id: "2", recipeId: "recipe-2", cookedAtDate: threeDaysAgo },
      ]);

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(1);
    });

    it("should handle errors gracefully and return 0", async () => {
      mockGetCookingHistory.mockRejectedValue(new Error("Database error"));

      const streak = await streakService.calculateCurrentStreak();

      expect(streak).toBe(0);
    });
  });

  describe("calculateLongestStreak", () => {
    it("should return 0 when no cooking history exists", async () => {
      mockGetCookingHistory.mockResolvedValue([]);

      const streak = await streakService.calculateLongestStreak();

      expect(streak).toBe(0);
    });

    it("should return 1 for a single cooking session", async () => {
      const today = new Date();
      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
      ]);

      const streak = await streakService.calculateLongestStreak();

      expect(streak).toBe(1);
    });

    it("should find longest streak from cooking history", async () => {
      const day1 = new Date("2024-01-01");
      const day2 = new Date("2024-01-02");
      const day3 = new Date("2024-01-03");
      const day10 = new Date("2024-01-10");
      const day11 = new Date("2024-01-11");
      const day12 = new Date("2024-01-12");

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: day1 },
        { id: "2", recipeId: "recipe-2", cookedAtDate: day2 },
        { id: "3", recipeId: "recipe-3", cookedAtDate: day3 },
        { id: "4", recipeId: "recipe-4", cookedAtDate: day10 },
        { id: "5", recipeId: "recipe-5", cookedAtDate: day11 },
        { id: "6", recipeId: "recipe-6", cookedAtDate: day12 },
      ]);

      const streak = await streakService.calculateLongestStreak();

      expect(streak).toBe(3); // day1-2-3
    });

    it("should return longest streak when multiple streaks exist", async () => {
      const day1 = new Date("2024-01-01");
      const day2 = new Date("2024-01-02");
      const day3 = new Date("2024-01-03");
      const day10 = new Date("2024-01-10");
      const day11 = new Date("2024-01-11");
      const day12 = new Date("2024-01-12");
      const day13 = new Date("2024-01-13");
      const day20 = new Date("2024-01-20");
      const day21 = new Date("2024-01-21");

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: day1 },
        { id: "2", recipeId: "recipe-2", cookedAtDate: day2 },
        { id: "3", recipeId: "recipe-3", cookedAtDate: day3 },
        { id: "4", recipeId: "recipe-4", cookedAtDate: day10 },
        { id: "5", recipeId: "recipe-5", cookedAtDate: day11 },
        { id: "6", recipeId: "recipe-6", cookedAtDate: day12 },
        { id: "7", recipeId: "recipe-7", cookedAtDate: day13 },
        { id: "8", recipeId: "recipe-8", cookedAtDate: day20 },
        { id: "9", recipeId: "recipe-9", cookedAtDate: day21 },
      ]);

      const streak = await streakService.calculateLongestStreak();

      expect(streak).toBe(4); // day10-11-12-13
    });

    it("should handle errors gracefully and return 0", async () => {
      mockGetCookingHistory.mockRejectedValue(new Error("Database error"));

      const streak = await streakService.calculateLongestStreak();

      expect(streak).toBe(0);
    });
  });

  describe("getStreakInfo", () => {
    it("should return complete streak information", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
        { id: "2", recipeId: "recipe-2", cookedAtDate: yesterday },
      ]);

      const streakInfo = await streakService.getStreakInfo();

      expect(streakInfo.currentStreak).toBe(2);
      expect(streakInfo.longestStreak).toBe(2);
      expect(streakInfo.lastCookingDate).toBeDefined();
      expect(streakInfo.streakHistory).toBeDefined();
      expect(streakInfo.streakHistory).toHaveLength(1);
    });

    it("should return zeros when no cooking history exists", async () => {
      mockGetCookingHistory.mockResolvedValue([]);

      const streakInfo = await streakService.getStreakInfo();

      expect(streakInfo.currentStreak).toBe(0);
      expect(streakInfo.longestStreak).toBe(0);
      expect(streakInfo.lastCookingDate).toBeUndefined();
      expect(streakInfo.streakHistory).toEqual([]);
    });

    it("should build streak history from cooking records", async () => {
      const day1 = new Date("2024-01-01T00:00:00");
      const day2 = new Date("2024-01-02T00:00:00");
      const day3 = new Date("2024-01-03T00:00:00");
      const day10 = new Date("2024-01-10T00:00:00");
      const day11 = new Date("2024-01-11T00:00:00");

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: day1 },
        { id: "2", recipeId: "recipe-2", cookedAtDate: day2 },
        { id: "3", recipeId: "recipe-3", cookedAtDate: day3 },
        { id: "4", recipeId: "recipe-4", cookedAtDate: day10 },
        { id: "5", recipeId: "recipe-5", cookedAtDate: day11 },
      ]);

      const streakInfo = await streakService.getStreakInfo();

      expect(streakInfo.streakHistory).toHaveLength(2);
      expect(streakInfo.streakHistory[0]!.streakCount).toBe(2); // 10-11 (most recent)
      expect(streakInfo.streakHistory[1]!.streakCount).toBe(3); // 1-2-3
    });

    it("should sort streak history with most recent first", async () => {
      const day1 = new Date("2024-01-01");
      const day2 = new Date("2024-01-02");
      const day10 = new Date("2024-01-10");

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: day1 },
        { id: "2", recipeId: "recipe-2", cookedAtDate: day2 },
        { id: "3", recipeId: "recipe-3", cookedAtDate: day10 },
      ]);

      const streakInfo = await streakService.getStreakInfo();

      expect(streakInfo.streakHistory).toHaveLength(2);
      expect(streakInfo.streakHistory[0]!.date.getTime()).toBeGreaterThan(
        streakInfo.streakHistory[1]!.date.getTime()
      );
    });

    it("should handle errors gracefully and return default values", async () => {
      mockGetCookingHistory.mockRejectedValue(new Error("Database error"));

      const streakInfo = await streakService.getStreakInfo();

      expect(streakInfo.currentStreak).toBe(0);
      expect(streakInfo.longestStreak).toBe(0);
      expect(streakInfo.streakHistory).toEqual([]);
    });
  });

  describe("isStreakActive", () => {
    it("should return true when current streak is active", async () => {
      const today = new Date();
      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
      ]);

      const isActive = await streakService.isStreakActive();

      expect(isActive).toBe(true);
    });

    it("should return false when no cooking history", async () => {
      mockGetCookingHistory.mockResolvedValue([]);

      const isActive = await streakService.isStreakActive();

      expect(isActive).toBe(false);
    });

    it("should return false when streak is broken", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: threeDaysAgo },
      ]);

      const isActive = await streakService.isStreakActive();

      expect(isActive).toBe(false);
    });

    it("should handle errors gracefully and return false", async () => {
      mockGetCookingHistory.mockRejectedValue(new Error("Database error"));

      const isActive = await streakService.isStreakActive();

      expect(isActive).toBe(false);
    });
  });

  describe("getDaysUntilStreakBreaks", () => {
    it("should return null when no cooking history", async () => {
      mockGetCookingHistory.mockResolvedValue([]);

      const days = await streakService.getDaysUntilStreakBreaks();

      expect(days).toBeNull();
    });

    it("should return 1 when cooked today", async () => {
      const today = new Date();
      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: today },
      ]);

      const days = await streakService.getDaysUntilStreakBreaks();

      expect(days).toBe(1);
    });

    it("should return 0 when cooked yesterday", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: yesterday },
      ]);

      const days = await streakService.getDaysUntilStreakBreaks();

      expect(days).toBe(0);
    });

    it("should return null when streak already broken", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      mockGetCookingHistory.mockResolvedValue([
        { id: "1", recipeId: "recipe-1", cookedAtDate: threeDaysAgo },
      ]);

      const days = await streakService.getDaysUntilStreakBreaks();

      expect(days).toBeNull();
    });

    it("should handle errors gracefully and return null", async () => {
      mockGetCookingHistory.mockRejectedValue(new Error("Database error"));

      const days = await streakService.getDaysUntilStreakBreaks();

      expect(days).toBeNull();
    });
  });
});
