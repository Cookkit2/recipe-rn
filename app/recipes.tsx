import Animated, { Easing, FadeIn, FadeOut } from "react-native-reanimated";
import RecipeStack from "~/components/Recipe/RecipeStack";
import { dummyRecipesData } from "~/data/dummy/dummy-recipes";
import { useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XIcon } from "lucide-nativewind";
/**
 *
 * @deprecated
 * Not in used anymore
 */
export default function RecipesPage() {
  const { top } = useSafeAreaInsets();
  const recipes = dummyRecipesData;
  const router = useRouter();

  return (
    <>
      <RecipeStack recipes={recipes} />
      <Animated.View
        entering={FadeIn.easing(Easing.out(Easing.quad))}
        exiting={FadeOut.easing(Easing.out(Easing.quad))}
        pointerEvents="box-none"
        className="absolute inset-x-0 items-center"
        style={{ top: top + 24 }}
      >
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => router.back()}
        >
          <XIcon className="text-foreground" />
        </Button>
      </Animated.View>
    </>
  );
}
