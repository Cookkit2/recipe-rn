import type { Leftover } from "~/types/Leftover";
import { Platform } from "react-native";
import {
  cancelNotification,
  scheduleNotification,
  getNotificationPermissions,
  requestNotificationPermissions,
} from "./notification-service";
import { notificationSettingsService } from "~/utils/notification-settings";

export const leftoverReminderId = (id: string) => `leftover-${id}`;

const operations = new Map<string, Promise<unknown>>();
function enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const next = (operations.get(id) ?? Promise.resolve()).catch(() => {}).then(operation);
  operations.set(id, next);
  const cleanup = () => {
    if (operations.get(id) === next) operations.delete(id);
  };
  void next.then(cleanup, cleanup);
  return next;
}
export function cancelLeftoverReminder(id: string): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  return enqueue(leftoverReminderId(id), () => cancelNotification(leftoverReminderId(id)));
}
export function syncLeftoverReminder(item: Leftover, requestPermission = false): Promise<boolean> {
  return enqueue(leftoverReminderId(item.id), () =>
    scheduleLeftoverReminder(item, requestPermission)
  );
}

async function scheduleLeftoverReminder(
  item: Leftover,
  requestPermission: boolean
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const id = leftoverReminderId(item.id);
  await cancelNotification(id);
  const settings = notificationSettingsService.getSettings();
  if (
    item.status !== "active" ||
    !item.remindAt ||
    item.remindAt <= new Date() ||
    !settings.enabled ||
    !settings.leftoverReminders
  )
    return false;
  let permission = await getNotificationPermissions();
  if (requestPermission && permission.status === "undetermined")
    permission = await requestNotificationPermissions();
  if (!permission.granted) return false;
  await scheduleNotification({
    id,
    title: "Leftovers to enjoy",
    body: `${item.name} is waiting in your fridge.`,
    data: { type: "leftover_reminder", screen: "/leftovers", leftoverId: item.id },
    trigger: { date: item.remindAt },
  });
  return true;
}
