import React, { useMemo } from "react";
import { View } from "react-native";
import { Button } from "../../ui/button";
import { H4, P } from "../../ui/typography";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Recipe } from "~/types/Recipe";

export default function BottomActionBar({
  recipe,
  serving,
}: {
  recipe: Recipe;
  serving: number;
}) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  const readyByLabel = useMemo(() => {
    if (!recipe) return { label: "Ready by —", time: "" };
    const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
    if (total <= 0) return { label: "Ready by —", time: "" };
    const dt = new Date(Date.now() + total * 60 * 1000);
    const rel = formatRelative(total);
    const crossesMidnight = crossesNextDay(new Date(), dt);
    const dayHint = crossesMidnight ? " (tomorrow)" : "";
    return {
      label: `Ready by ${formatTime(dt)}${dayHint}`,
      time: rel,
    };
  }, [recipe]);

  return (
    <View
      className="absolute left-0 right-0 bottom-0 border-t border-border pt-3 bg-background shadow-md"
      style={{ paddingBottom: bottom }}
    >
      <View className="px-6 pb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-col">
            <View className="flex-row items-center gap-2">
              <P className="text-foreground font-semibold">
                {readyByLabel.label}
              </P>
              <P className="text-muted-foreground">({readyByLabel.time})</P>
            </View>
            <P className="text-muted-foreground">
              {serving} {serving === 1 ? "serving" : "servings"}
            </P>
          </View>
          <Button
            size="lg"
            className="rounded-full px-6"
            onPress={() => router.push(`/recipes/${recipe.id}/steps`)}
          >
            <H4 className="text-background">Cook</H4>
          </Button>
        </View>
      </View>
    </View>
  );
}

// ----- Time formatting helper -----

const formatTime = (date: Date): string => {
  try {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    // Fallback: HH:MM
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
};

const formatRelative = (minutesFromNow: number): string => {
  if (minutesFromNow < 60) return `in ${minutesFromNow}m`;
  const hours = Math.floor(minutesFromNow / 60);
  const mins = minutesFromNow % 60;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
};

const crossesNextDay = (from: Date, to: Date): boolean => {
  return (
    from.getFullYear() !== to.getFullYear() ||
    from.getMonth() !== to.getMonth() ||
    from.getDate() !== to.getDate()
  );
};
