import { useRouter } from "expo-router";
import { XIcon } from "lucide-nativewind";
import React, { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { useRecipeSteps } from "~/store/RecipeStepsContext";

export default function StepHeaderBar() {
  const { top } = useSafeAreaInsets();
  const { progress, stepPages } = useRecipeSteps();
  const router = useRouter();

  const progressPercentage = useMemo(() => {
    return (progress.value / stepPages.length) * 100;
  }, [progress.value, stepPages.length]);

  return (
    <View
      className="flex flex-row items-center gap-4 px-4"
      style={{ paddingTop: top + 8 }}
    >
      <Progress value={progressPercentage} className="flex-1 h-6" />
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => router.back()}
      >
        <XIcon className="text-foreground" />
      </Button>
    </View>
  );
}
