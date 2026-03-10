import { useRouter } from "expo-router";
import { HelpCircleIcon, XIcon } from "lucide-uniwind";
import { useState } from "react";
import { View } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { VoiceHelpSheet } from "~/components/VoiceCooking/VoiceHelpSheet";

export default function StepHeaderBar() {
  const { top } = useSafeAreaInsets();
  const { progress, stepPages } = useRecipeSteps();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  const progressPercentage = useDerivedValue(() => {
    const percent = (progress.value / (stepPages.length - 1)) * 100;
    return percent;
  });

  return (
    <>
      <View className="flex flex-row items-center gap-4 px-4" style={{ paddingTop: top + 8 }}>
        <Progress animatedValue={progressPercentage} className="flex-1 h-6" />
        {/* <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          onPress={() => setHelpOpen(true)}
        >
          <HelpCircleIcon className="text-foreground" />
        </Button> */}
        <Button size="icon" variant="ghost" className="rounded-full" onPress={() => router.back()}>
          <XIcon className="text-foreground" />
        </Button>
      </View>
      <VoiceHelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
