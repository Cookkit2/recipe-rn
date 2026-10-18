jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue("scheduled"),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval", DATE: "date" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("~/utils/notification-settings", () => ({
  notificationSettingsService: {
    getSettings: jest.fn().mockReturnValue({ enabled: true }),
    isNotificationDataEnabled: jest.fn().mockReturnValue(true),
  },
}));
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { notificationSettingsService } from "~/utils/notification-settings";
import { initializeNotifications, scheduleNotification } from "../notification-service";

it("uses Android's default channel sound without naming a nonexistent custom sound file", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");
  try {
    await initializeNotifications();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  } finally {
    platform.restore();
  }
});

describe("notification grouping", () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([
    ["cooking_timer", "cookkit.cooking"],
    ["ingredient_expiry", "cookkit.expiry"],
    ["leftover_reminder", "cookkit.leftovers"],
    ["achievement_unlocked", "cookkit.achievements"],
    ["challenge_completed", "cookkit.achievements"],
  ])("groups %s while preserving its trigger and payload", async (type, threadIdentifier) => {
    await scheduleNotification({
      id: "original",
      title: "Reminder",
      body: "Ready",
      data: { type, timerId: "pasta" },
      trigger: { seconds: 60 },
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: "original",
      content: expect.objectContaining({
        threadIdentifier,
        data: { type, timerId: "pasta" },
        sound: "default",
      }),
      trigger: { type: "timeInterval", seconds: 60, repeats: false },
    });
  });
  it("supports an explicit thread for a caller", async () => {
    await scheduleNotification({
      title: "Reminder",
      body: "Ready",
      data: { type: "ingredient_expiry" },
      threadIdentifier: "custom",
      trigger: { seconds: 1 },
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.objectContaining({ threadIdentifier: "custom" }) })
    );
  });
  it("still respects disabled notification categories", async () => {
    jest.mocked(notificationSettingsService.isNotificationDataEnabled).mockReturnValueOnce(false);
    await scheduleNotification({
      title: "Reminder",
      body: "Ready",
      data: { type: "leftover_reminder" },
      trigger: { seconds: 1 },
    });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
