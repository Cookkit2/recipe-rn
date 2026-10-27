import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useLeftovers } from "~/hooks/queries/useLeftovers";
import { syncLeftoverReminder } from "./leftover-reminders";
import { useNotificationContext } from "./NotificationProvider";
import { log } from "~/utils/logger";

export default function LeftoverReminderReconciler() {
  const { data: items, refetch } = useLeftovers();
  const { isInitialized } = useNotificationContext();
  useEffect(() => {
    if (!isInitialized || !items || Platform.OS === "web") return;
    void Promise.all(items.map((item) => syncLeftoverReminder(item))).catch((error) =>
      log.warn("Couldn't reconcile leftover reminders", error)
    );
  }, [items, isInitialized]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);
  return null;
}
