/**
 * useSelectionHaptic
 *
 * Shared hook for light-impact haptic feedback on selection/press interactions.
 * Extracts the duplicated handleHapticFeedback callback used across MealPlan components.
 */
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { log } from "~/utils/logger";

/**
 * Returns a stable callback that triggers a light haptic impact,
 * catching and logging errors when haptics are unavailable (e.g. simulator).
 */
export function useSelectionHaptic() {
  return useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
      log.warn("Haptics not available:", error);
    });
  }, []);
}
