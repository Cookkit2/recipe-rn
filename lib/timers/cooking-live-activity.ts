import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { CookingActivityController } from "./live-activity-controller";
import type { Timer } from "~/types/Timer";
import { log } from "~/utils/logger";

const controller = new CookingActivityController(async () => {
  const { default: activity } = await import("./cooking-timer-activity");
  return activity;
});

export async function syncCookingLiveActivity(
  timers: Timer[],
  completedTimer?: Timer
): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (!requireOptionalNativeModule("ExpoWidgets")) return;
  try {
    await controller.sync(timers, completedTimer);
  } catch (error) {
    // ActivityKit may be disabled or at its system limit. Cooking timers still work.
    log.warn("Could not update cooking Live Activity:", error);
  }
}
