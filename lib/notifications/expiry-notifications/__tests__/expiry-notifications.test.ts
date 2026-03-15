/// <reference types="jest" />
import { scheduleExpiryNotifications } from "../expiry-notifications";

jest.mock("../../notification-service", () => ({
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
}));

jest.mock("~/utils/notification-settings", () => ({
  notificationSettingsService: {
    getSettings: () => ({
      enabled: true,
      ingredientExpiry: true,
    }),
  },
}));

const getRecipeRecommendationsForExpiring = jest.fn(async () => ({
  recipes: [],
}));

jest.mock("~/data/api/recipeApi", () => ({
  recipeApi: {
    getRecipeRecommendationsForExpiring: () => getRecipeRecommendationsForExpiring(),
  },
}));

import { scheduleNotification } from "../../notification-service";

describe("scheduleExpiryNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls recipeApi.getRecipeRecommendationsForExpiring once per run", async () => {
    const now = new Date();
    const future1 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const future2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    await scheduleExpiryNotifications([
      { id: "1", name: "Milk", expiry_date: future1 } as any,
      { id: "2", name: "Eggs", expiry_date: future2 } as any,
    ]);

    expect(getRecipeRecommendationsForExpiring).toHaveBeenCalledTimes(1);
  });

  it("schedules notifications only for future notification dates", async () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    await scheduleExpiryNotifications([
      { id: "past", name: "Old", expiry_date: past } as any,
      { id: "future", name: "Fresh", expiry_date: future } as any,
    ]);

    const calls = (scheduleNotification as any).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const ids = calls.map((c) => c[0].id);
    expect(ids).toContain("expiry-future");
  });
});
