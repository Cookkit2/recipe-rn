import { lazy, Suspense, useEffect, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, View } from "react-native";
import { RECIPE_GLOW_EXIT_MS } from "./recipe-loading-glow";

// Skia is evaluated only when an AI operation is visible, never on idle app startup.
const Surface = lazy(() => import("./RecipeLoadingGlowSurface"));

export default function RecipeLoadingGlowOverlay({ active }: { active: boolean }) {
  const [present, setPresent] = useState(active);
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background" && AppState.currentState !== "inactive"
  );
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active")
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      changed = true;
      setReducedMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted && !changed) setReducedMotion(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (active) {
      setPresent(true);
      return;
    }
    if (reducedMotion) {
      setPresent(false);
      return;
    }
    const timer = setTimeout(() => setPresent(false), RECIPE_GLOW_EXIT_MS);
    return () => clearTimeout(timer);
  }, [active, reducedMotion]);

  if (!present || !foreground) return null;
  return (
    <View
      testID="recipe-ai-loading-glow"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
    >
      <Suspense fallback={null}>
        <Surface active={active} reducedMotion={reducedMotion} />
      </Suspense>
    </View>
  );
}
