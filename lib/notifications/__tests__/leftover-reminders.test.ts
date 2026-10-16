import { syncLeftoverReminder, cancelLeftoverReminder } from "../leftover-reminders";
import {
  cancelNotification,
  scheduleNotification,
  getNotificationPermissions,
  requestNotificationPermissions,
} from "../notification-service";
import { notificationSettingsService } from "~/utils/notification-settings";
import type { Leftover } from "~/types/Leftover";
jest.mock("../notification-service", () => ({
  cancelNotification: jest.fn(),
  scheduleNotification: jest.fn(),
  getNotificationPermissions: jest.fn(),
  requestNotificationPermissions: jest.fn(),
}));
jest.mock("~/utils/notification-settings", () => ({
  notificationSettingsService: { getSettings: jest.fn() },
}));
const item: Leftover = {
  id: "one",
  name: "Soup",
  servings: 2,
  cookedAt: new Date(),
  remindAt: new Date(Date.now() + 86400000),
  status: "active",
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(notificationSettingsService.getSettings).mockReturnValue({
    enabled: true,
    ingredientExpiry: true,
    leftoverReminders: true,
    achievements: true,
    challenges: true,
  });
  jest.mocked(getNotificationPermissions).mockResolvedValue({ granted: true, status: "granted" });
});
it("schedules exactly one reminder with a stable ID and leftovers destination", async () => {
  expect(await syncLeftoverReminder(item)).toBe(true);
  expect(cancelNotification).toHaveBeenCalledWith("leftover-one");
  expect(scheduleNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "leftover-one",
      data: expect.objectContaining({ type: "leftover_reminder", screen: "/leftovers" }),
      trigger: { date: item.remindAt },
    })
  );
});
it.each(["eaten", "discarded"] as const)("cancels reminders when food is %s", async (status) => {
  expect(await syncLeftoverReminder({ ...item, status })).toBe(false);
  expect(cancelNotification).toHaveBeenCalled();
  expect(scheduleNotification).not.toHaveBeenCalled();
});
it("respects settings and never prompts during reconciliation", async () => {
  jest
    .mocked(getNotificationPermissions)
    .mockResolvedValue({ granted: false, status: "undetermined" });
  expect(await syncLeftoverReminder(item)).toBe(false);
  expect(requestNotificationPermissions).not.toHaveBeenCalled();
  jest.mocked(notificationSettingsService.getSettings).mockReturnValue({
    enabled: false,
    ingredientExpiry: true,
    leftoverReminders: true,
    achievements: true,
    challenges: true,
  });
  expect(await syncLeftoverReminder(item, true)).toBe(false);
  expect(scheduleNotification).not.toHaveBeenCalled();
});
it("asks on a user save, and keeps entries usable when permission is denied", async () => {
  jest
    .mocked(getNotificationPermissions)
    .mockResolvedValue({ granted: false, status: "undetermined" });
  jest
    .mocked(requestNotificationPermissions)
    .mockResolvedValue({ granted: false, status: "denied" });
  expect(await syncLeftoverReminder(item, true)).toBe(false);
  expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
  expect(scheduleNotification).not.toHaveBeenCalled();
});
it("does not send past reminders immediately on relaunch", async () => {
  expect(await syncLeftoverReminder({ ...item, remindAt: new Date(2000, 0, 1) })).toBe(false);
  expect(scheduleNotification).not.toHaveBeenCalled();
});
it("cancels last when food is eaten while scheduling is still in flight", async () => {
  let release!: (permission: { granted: boolean; status: "granted" }) => void;
  let started!: () => void;
  const waiting = new Promise<{ granted: boolean; status: "granted" }>((resolve) => {
    release = resolve;
  });
  const permissionStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  jest.mocked(getNotificationPermissions).mockImplementationOnce(() => {
    started();
    return waiting;
  });
  const scheduling = syncLeftoverReminder(item);
  await permissionStarted;
  const cancellation = cancelLeftoverReminder(item.id);
  release({ granted: true, status: "granted" });
  await Promise.all([scheduling, cancellation]);
  expect(jest.mocked(cancelNotification).mock.invocationCallOrder.at(-1)).toBeGreaterThan(
    jest.mocked(scheduleNotification).mock.invocationCallOrder[0]!
  );
});
