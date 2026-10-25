import { log } from "~/utils/logger";

let pending = false;
let running = false;
let changedDuringCheck = false;

/** Coalesce rapid pantry mutations; achievement work must not delay their UI. */
export function scheduleAchievementCheck(): void {
  if (pending) {
    if (running) changedDuringCheck = true;
    return;
  }
  pending = true;
  setTimeout(() => {
    running = true;
    void import("./AchievementService")
      .then(({ achievementService }) => achievementService.checkAchievements())
      .catch((error) => log.warn("Background achievement check failed", error))
      .finally(() => {
        pending = false;
        running = false;
        if (changedDuringCheck) {
          changedDuringCheck = false;
          scheduleAchievementCheck();
        }
      });
  }, 0);
}
