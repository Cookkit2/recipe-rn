import { jest } from "@jest/globals";

// --- Mocks ---------------------------------------------------------------

interface ScheduleOpts {
  id?: string;
  title: string;
  body: string;
  data: { type?: string; surface?: string; recipeIds?: string[]; [k: string]: unknown };
  trigger: { hour: number; minute: number; repeats: true };
}

const scheduleNotification = jest.fn(async (_opts: ScheduleOpts) => "expiry-reengagement");
const cancelNotification = jest.fn(async (_id: string) => undefined);

jest.mock("../../notification-service", () => ({
  scheduleNotification,
  cancelNotification,
}));

// Channel-gated settings service. Tests mutate the returned shape per case.
const settingsMock = {
  enabled: true,
  ingredientExpiry: true,
};
jest.mock("~/utils/notification-settings", () => ({
  notificationSettingsService: {
    getSettings: () => settingsMock,
  },
}));

// recipeApi fixture: tests override `nextResult` per case.
let nextResult: { recipes: Array<{ recipe: { id: string } }>; expiringIngredientIds: Set<string> } =
  {
    recipes: [{ recipe: { id: "r-1" } }, { recipe: { id: "r-2" } }],
    expiringIngredientIds: new Set(["stock-1", "stock-2", "stock-3"]),
  };
jest.mock("~/data/api/recipeApi", () => ({
  recipeApi: {
    getRecipeRecommendationsForExpiring: async () => nextResult,
  },
}));

// Stub the funnel emitter so the module's scheduling path can call it without
// dragging in Sentry / RevenueCat.
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitExpiringNudgeShown: jest.fn(),
}));

import {
  scheduleExpiryReengagementNotification,
  cancelExpiryReengagementNotification,
  EXPIRY_REENGAGEMENT_NOTIFICATION_ID,
  EXPIRY_REENGAGEMENT_HOUR,
  EXPIRY_REENGAGEMENT_MINUTE,
} from "../expiry-reengagement";

describe("scheduleExpiryReengagementNotification", () => {
  beforeEach(() => {
    scheduleNotification.mockClear();
    cancelNotification.mockClear();
    settingsMock.enabled = true;
    settingsMock.ingredientExpiry = true;
    nextResult = {
      recipes: [{ recipe: { id: "r-1" } }, { recipe: { id: "r-2" } }],
      expiringIngredientIds: new Set(["stock-1", "stock-2", "stock-3"]),
    };
  });

  it("schedules a recurring daily nudge with recipe links when items are expiring", async () => {
    await scheduleExpiryReengagementNotification();

    expect(scheduleNotification).toHaveBeenCalledTimes(1);
    const opts = scheduleNotification.mock.calls[0]![0];

    expect(opts.id).toBe(EXPIRY_REENGAGEMENT_NOTIFICATION_ID);
    expect(opts.data.type).toBe("ingredient_expiry");
    expect(opts.data.surface).toBe("reengagement_notification");
    expect(opts.data.recipeIds).toEqual(["r-1", "r-2"]);
    // Plural body names the expiring count.
    expect(opts.body).toContain("3 ingredients");
    // Recurring daily trigger at the configured local hour.
    expect(opts.trigger).toEqual({
      hour: EXPIRY_REENGAGEMENT_HOUR,
      minute: EXPIRY_REENGAGEMENT_MINUTE,
      repeats: true,
    });
  });

  it("uses a singular body when exactly one ingredient is expiring", async () => {
    nextResult = {
      recipes: [{ recipe: { id: "r-1" } }],
      expiringIngredientIds: new Set(["stock-1"]),
    };

    await scheduleExpiryReengagementNotification();

    const opts = scheduleNotification.mock.calls[0]![0];
    expect(opts.body).toContain("1 ingredient");
  });

  it("is a no-op when the global enabled gate is off", async () => {
    settingsMock.enabled = false;

    await scheduleExpiryReengagementNotification();

    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  it("is a no-op when the ingredientExpiry channel is off", async () => {
    settingsMock.ingredientExpiry = false;

    await scheduleExpiryReengagementNotification();

    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  it("cancels the nudge when no ingredients are expiring (no stale nudge)", async () => {
    nextResult = { recipes: [], expiringIngredientIds: new Set() };

    await scheduleExpiryReengagementNotification();

    expect(scheduleNotification).not.toHaveBeenCalled();
    expect(cancelNotification).toHaveBeenCalledWith(EXPIRY_REENGAGEMENT_NOTIFICATION_ID);
  });

  it("limits attached recipe links to MAX_RECIPE_LINKS (3)", async () => {
    nextResult = {
      recipes: [
        { recipe: { id: "r-1" } },
        { recipe: { id: "r-2" } },
        { recipe: { id: "r-3" } },
        { recipe: { id: "r-4" } },
        { recipe: { id: "r-5" } },
      ],
      expiringIngredientIds: new Set(["stock-1"]),
    };

    await scheduleExpiryReengagementNotification();

    const opts = scheduleNotification.mock.calls[0]![0];
    expect(opts.data.recipeIds).toHaveLength(3);
  });
});

describe("cancelExpiryReengagementNotification", () => {
  beforeEach(() => {
    cancelNotification.mockClear();
  });

  it("cancels by the stable id and swallows errors", async () => {
    await cancelExpiryReengagementNotification();
    expect(cancelNotification).toHaveBeenCalledWith(EXPIRY_REENGAGEMENT_NOTIFICATION_ID);
  });

  it("does not throw when cancel rejects", async () => {
    cancelNotification.mockRejectedValueOnce(new Error("boom"));
    await expect(cancelExpiryReengagementNotification()).resolves.toBeUndefined();
  });
});
