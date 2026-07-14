jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: () => Math.random().toString(36).substring(7),
}));

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("~/lib/notifications/notification-service", () => ({
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
}));

import { timerService } from "../timer-service";

describe("TimerService", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    await timerService.cancelAllTimers();
  });

  afterEach(async () => {
    await timerService.cancelAllTimers();
    jest.useRealTimers();
  });

  it("should exist", () => {
    expect(timerService).toBeDefined();
  });

  it("should create a timer", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    expect(timer.name).toBe("Test Timer");
    expect(timer.durationSeconds).toBe(60);
    expect(timer.remainingSeconds).toBe(60);
    expect(timer.status).toBe("idle");
    expect(timer.createdAt).toEqual(new Date("2023-01-01T00:00:00.000Z"));
  });

  it("should start a timer", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    await timerService.startTimer(timer.id);
    const updatedTimer = timerService.getTimer(timer.id);
    expect(updatedTimer?.status).toBe("running");
    expect(updatedTimer?.startedAt).toEqual(new Date("2023-01-01T00:00:00.000Z"));
    expect(updatedTimer?.pausedAt).toBeUndefined();
  });

  it("should calculate remaining seconds when running", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    await timerService.startTimer(timer.id);

    // Advance time by 10 seconds
    jest.setSystemTime(new Date("2023-01-01T00:00:10.000Z"));

    const updatedTimer = timerService.getTimer(timer.id);
    expect(updatedTimer?.remainingSeconds).toBe(50);
  });

  it("should pause a timer", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    await timerService.startTimer(timer.id);

    // Advance time by 10 seconds and pause
    jest.setSystemTime(new Date("2023-01-01T00:00:10.000Z"));
    await timerService.pauseTimer(timer.id);

    const updatedTimer = timerService.getTimer(timer.id);
    expect(updatedTimer?.status).toBe("paused");
    expect(updatedTimer?.remainingSeconds).toBe(50);
    expect(updatedTimer?.pausedAt).toEqual(new Date("2023-01-01T00:00:10.000Z"));
  });

  it("should resume a paused timer correctly", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    await timerService.startTimer(timer.id);

    // Run for 10 seconds
    jest.setSystemTime(new Date("2023-01-01T00:00:10.000Z"));
    await timerService.pauseTimer(timer.id);

    // Stay paused for 20 seconds
    jest.setSystemTime(new Date("2023-01-01T00:00:30.000Z"));
    await timerService.resumeTimer(timer.id);

    const updatedTimer = timerService.getTimer(timer.id);
    expect(updatedTimer?.status).toBe("running");
    expect(updatedTimer?.pausedAt).toBeUndefined();
    // After resuming, the new startedAt should be (now - 10 seconds of previous run time)
    expect(updatedTimer?.startedAt).toEqual(new Date("2023-01-01T00:00:20.000Z"));

    // Verify remaining seconds is still 50 right after resume
    expect(updatedTimer?.remainingSeconds).toBe(50);

    // Run for 5 more seconds
    jest.setSystemTime(new Date("2023-01-01T00:00:35.000Z"));
    const finalTimer = timerService.getTimer(timer.id);
    expect(finalTimer?.remainingSeconds).toBe(45);
  });

  it("should complete a timer automatically via tick interval", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 5 });
    await timerService.startTimer(timer.id);

    // Advance time past the duration and run timers (for intervals to fire)
    jest.setSystemTime(new Date("2023-01-01T00:00:06.000Z"));
    jest.advanceTimersByTime(1000);

    const finalTimer = timerService.getTimer(timer.id);
    expect(finalTimer?.status).toBe("completed");
    expect(finalTimer?.remainingSeconds).toBe(0);
  });

  it("should cancel a timer", async () => {
    const timer = await timerService.createTimer({ name: "Test Timer", durationSeconds: 60 });
    await timerService.cancelTimer(timer.id);

    const retrievedTimer = timerService.getTimer(timer.id);
    expect(retrievedTimer).toBeUndefined();
  });

  it("should update a timer name", async () => {
    const timer = await timerService.createTimer({ name: "Old Name", durationSeconds: 60 });
    await timerService.updateTimer(timer.id, { name: "New Name" });

    const retrievedTimer = timerService.getTimer(timer.id);
    expect(retrievedTimer?.name).toBe("New Name");
  });

  it("should sort all timers properly", async () => {
    const timer1 = await timerService.createTimer({ name: "Timer 1", durationSeconds: 60 });
    jest.setSystemTime(new Date("2023-01-01T00:00:01.000Z"));
    const timer2 = await timerService.createTimer({ name: "Timer 2", durationSeconds: 60 });

    // start timer2
    await timerService.startTimer(timer2.id);

    const allTimers = timerService.getAllTimers();
    expect(allTimers.length).toBe(2);
    // Running timers should be first
    expect(allTimers[0].id).toBe(timer2.id);
    expect(allTimers[1].id).toBe(timer1.id);
  });

  it("should get active timers", async () => {
    const timer1 = await timerService.createTimer({ name: "Timer 1", durationSeconds: 60 });
    const timer2 = await timerService.createTimer({ name: "Timer 2", durationSeconds: 60 });
    const timer3 = await timerService.createTimer({ name: "Timer 3", durationSeconds: 5 }); // Will complete

    await timerService.startTimer(timer1.id);
    await timerService.startTimer(timer2.id);

    jest.setSystemTime(new Date("2023-01-01T00:00:02.000Z"));
    await timerService.pauseTimer(timer2.id);

    await timerService.startTimer(timer3.id);
    jest.setSystemTime(new Date("2023-01-01T00:00:08.000Z"));
    jest.advanceTimersByTime(1000); // trigger completion of timer3

    const activeTimers = timerService.getActiveTimers();
    expect(activeTimers.length).toBe(2);
    const activeIds = activeTimers.map((t) => t.id);
    expect(activeIds).toContain(timer1.id);
    expect(activeIds).toContain(timer2.id);
    expect(activeIds).not.toContain(timer3.id); // Completed is not active
  });
});
