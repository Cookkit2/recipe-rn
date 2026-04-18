import { timerService, formatTimerDuration, formatTimerDurationText } from "../timer-service";
import * as Crypto from "expo-crypto";
import { storage } from "~/data";
import { log } from "~/utils/logger";
import { AppState } from "react-native";
import { COOKING_TIMERS_KEY } from "~/constants/storage-keys";

// Mock dependencies
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("~/data", () => ({
  storage: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
  },
}));

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: "active",
  },
}));

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

jest.mock("~/lib/notifications/notification-service", () => ({
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
}));

// We must also mock storage-keys since it's imported by timer-service and might need it
jest.mock("~/constants/storage-keys", () => ({
  COOKING_TIMERS_KEY: "COOKING_TIMERS_KEY",
}));

describe("TimerService", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    const timers = timerService.getAllTimers();
    for (const t of timers) {
      await timerService.cancelTimer(t.id);
    }
    // Now that they are all deleted and state is synced, clear the mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("createTimer", () => {
    it("should create a new timer with the correct initial state and add it to the internal Map", async () => {
      // Set up a fake date for predictable Date.now() and new Date()
      const mockDate = new Date("2023-01-01T12:00:00.000Z");
      jest.setSystemTime(mockDate);

      const input = {
        name: "Pasta Timer",
        durationSeconds: 600, // 10 minutes
        recipeId: "recipe_1",
        stepNumber: 3,
      };

      const timer = await timerService.createTimer(input);

      // Verify the returned timer matches expectations
      expect(timer).toEqual({
        id: `timer_${mockDate.getTime()}_test-uuid-1234`,
        name: "Pasta Timer",
        durationSeconds: 600,
        remainingSeconds: 600,
        status: "idle",
        createdAt: mockDate,
        recipeId: "recipe_1",
        stepNumber: 3,
      });

      // Verify it was added to the internal Map
      const retrievedTimer = timerService.getTimer(timer.id);
      expect(retrievedTimer).toEqual(timer);

      // Verify it's in the list of all timers
      const allTimers = timerService.getAllTimers();
      expect(allTimers).toHaveLength(1);
      expect(allTimers[0]).toEqual(timer);
    });

    it("should persist the new timer to storage", async () => {
      const input = {
        name: "Egg Timer",
        durationSeconds: 300,
      };

      await timerService.createTimer(input);

      // Verify storage.set was called with the correct key and data
      expect(storage.set).toHaveBeenCalledTimes(1);
      expect(storage.set).toHaveBeenCalledWith(COOKING_TIMERS_KEY, expect.any(String));

      // Parse the JSON string passed to storage.set to verify its contents
      const savedDataStr = (storage.set as jest.Mock).mock.calls[0][1];
      const savedData = JSON.parse(savedDataStr);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe("Egg Timer");
      expect(savedData[0].durationSeconds).toBe(300);
      expect(savedData[0].status).toBe("idle");
    });

    it("should notify subscribers when a new timer is created", async () => {
      const mockCallback = jest.fn();

      // Register callback
      const unsubscribe = timerService.onTimerUpdate(mockCallback);

      const input = {
        name: "Baking Timer",
        durationSeconds: 1200,
      };

      await timerService.createTimer(input);

      // Verify callback was called with the updated timers list
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // The callback should receive the array of timers
      const calledWithTimers = mockCallback.mock.calls[0][0];
      expect(calledWithTimers).toHaveLength(1);
      expect(calledWithTimers[0].name).toBe("Baking Timer");

      // Cleanup
      unsubscribe();
    });
  });

  describe("formatTimerDuration", () => {
    it("formats seconds less than a minute correctly", () => {
      expect(formatTimerDuration(0)).toBe("0:00");
      expect(formatTimerDuration(5)).toBe("0:05");
      expect(formatTimerDuration(59)).toBe("0:59");
    });

    it("formats exact minutes correctly", () => {
      expect(formatTimerDuration(60)).toBe("1:00");
      expect(formatTimerDuration(120)).toBe("2:00");
    });

    it("formats minutes and seconds correctly", () => {
      expect(formatTimerDuration(65)).toBe("1:05");
      expect(formatTimerDuration(125)).toBe("2:05");
      expect(formatTimerDuration(3599)).toBe("59:59");
    });

    it("formats exact hours correctly", () => {
      expect(formatTimerDuration(3600)).toBe("1:00:00");
      expect(formatTimerDuration(7200)).toBe("2:00:00");
    });

    it("formats hours, minutes, and seconds correctly", () => {
      expect(formatTimerDuration(3605)).toBe("1:00:05");
      expect(formatTimerDuration(3665)).toBe("1:01:05");
      expect(formatTimerDuration(3660)).toBe("1:01:00");
    });
  });

  describe("formatTimerDurationText", () => {
    it("formats seconds rounding up to minutes correctly", () => {
      expect(formatTimerDurationText(0)).toBe("0 minutes");
      expect(formatTimerDurationText(30)).toBe("1 minute");
      expect(formatTimerDurationText(60)).toBe("1 minute");
      expect(formatTimerDurationText(119)).toBe("2 minutes");
      expect(formatTimerDurationText(120)).toBe("2 minutes");
    });

    it("formats exact hours correctly", () => {
      expect(formatTimerDurationText(3600)).toBe("1 hour");
      expect(formatTimerDurationText(7200)).toBe("2 hours");
    });

    it("formats hours and minutes correctly", () => {
      expect(formatTimerDurationText(3660)).toBe("1 hour and 1 minute");
      expect(formatTimerDurationText(3720)).toBe("1 hour and 2 minutes");
      expect(formatTimerDurationText(7260)).toBe("2 hours and 1 minute");
      expect(formatTimerDurationText(7320)).toBe("2 hours and 2 minutes");
    });
  });
});
