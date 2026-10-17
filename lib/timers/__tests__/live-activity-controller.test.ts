import {
  CookingActivityController,
  type CookingActivityFactory,
} from "../live-activity-controller";
import type { Timer } from "~/types/Timer";

const timer = (overrides: Partial<Timer> = {}): Timer => ({
  id: "pasta",
  name: "Pasta",
  durationSeconds: 120,
  remainingSeconds: 120,
  status: "running",
  createdAt: new Date(0),
  startedAt: new Date(0),
  ...overrides,
});

describe("cooking Live Activity lifecycle", () => {
  const instance = {
    update: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
  };
  let factory: CookingActivityFactory;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    jest.clearAllMocks();
    factory = {
      getInstances: jest.fn().mockReturnValue([]),
      start: jest.fn().mockReturnValue(instance),
    };
  });
  afterEach(() => jest.useRealTimers());

  it("starts one activity with the next finishing timer first, using absolute native dates", async () => {
    const controller = new CookingActivityController(async () => factory);
    await controller.sync([timer({ id: "oven", durationSeconds: 600 }), timer()]);
    expect(factory.start).toHaveBeenCalledTimes(1);
    expect(factory.start).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCount: 2,
        timers: [
          expect.objectContaining({ id: "pasta", endsAt: 120000 }),
          expect.objectContaining({ id: "oven" }),
        ],
      }),
      "cookkit:///timers",
      new Date(120000)
    );
  });

  it("recovers an existing activity after relaunch, removes duplicates, and freezes paused timers", async () => {
    const duplicate = { ...instance, end: jest.fn().mockResolvedValue(undefined) };
    factory.getInstances = () => [instance, duplicate];
    const controller = new CookingActivityController(async () => factory);
    await controller.sync([timer({ status: "paused", remainingSeconds: 73 })]);
    expect(factory.start).not.toHaveBeenCalled();
    expect(duplicate.end).toHaveBeenCalledWith("immediate");
    expect(instance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        timers: [expect.objectContaining({ paused: true, remainingSeconds: 73 })],
      }),
      undefined
    );
  });

  it("dismisses cancelled timers and briefly retains a completed timer's final state", async () => {
    factory.getInstances = () => [instance];
    const controller = new CookingActivityController(async () => factory);
    await controller.sync([]);
    expect(instance.end).toHaveBeenLastCalledWith("immediate", undefined);
    await controller.sync([], timer({ status: "completed" }));
    expect(instance.end).toHaveBeenLastCalledWith(
      { after: new Date(60000) },
      expect.objectContaining({ completed: true, totalCount: 0 })
    );
  });

  it("serializes rapid pause/resume/cancel and snapshots mutable timers before awaiting native work", async () => {
    factory.getInstances = () => [instance];
    const controller = new CookingActivityController(async () => factory);
    const mutable = timer();
    const running = controller.sync([mutable]);
    mutable.status = "paused";
    mutable.remainingSeconds = 50;
    const paused = controller.sync([mutable]);
    const cancelled = controller.sync([]);
    await Promise.all([running, paused, cancelled]);
    expect(instance.update.mock.calls[0]?.[0].timers[0].paused).toBe(false);
    expect(instance.update.mock.calls[1]?.[0].timers[0].remainingSeconds).toBe(50);
    expect(instance.end).toHaveBeenCalledWith("immediate", undefined);
    expect(instance.update.mock.invocationCallOrder[1]).toBeLessThan(
      instance.end.mock.invocationCallOrder[0]!
    );
  });

  it("continues syncing after ActivityKit rejects an update", async () => {
    factory.getInstances = () => [instance];
    instance.update.mockRejectedValueOnce(new Error("Activities disabled"));
    const controller = new CookingActivityController(async () => factory);
    await expect(controller.sync([timer()])).rejects.toThrow("Activities disabled");
    await controller.sync([]);
    expect(instance.end).toHaveBeenCalled();
  });

  it("does not recreate expired or idle timers on foreground", async () => {
    jest.setSystemTime(180000);
    const controller = new CookingActivityController(async () => factory);
    await controller.sync([timer(), timer({ status: "idle" })]);
    expect(factory.start).not.toHaveBeenCalled();
  });
});
