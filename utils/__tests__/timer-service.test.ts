import { timerService } from "../timer-service";
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
});
