import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import RecipeStack from "~/components/Recipe/RecipeStack";

import { Pressable, View } from "react-native";
import { dummyRecipesData } from "~/data/dummy-recipes";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Button } from "~/components/ui/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XIcon } from "~/lib/icons/Back";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function RecipesPage() {
  const { top: pt, bottom: pb } = useSafeAreaInsets();
  const recipes = dummyRecipesData;
  const router = useRouter();

  return (
    <>
      <AnimatedBlurView
        entering={FadeIn.springify()}
        exiting={FadeOut.springify()}
        intensity={40}
        className="absolute inset-0"
      />

      <RecipeStack recipes={recipes} />
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 items-center"
        style={{ top: pt + 24 }}
      >
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => router.back()}
        >
          <XIcon className="text-foreground" />
        </Button>
      </View>
    </>
  );
}
