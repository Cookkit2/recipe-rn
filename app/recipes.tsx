import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import RecipeStack from "~/components/Recipe/RecipeStack";
import { dummyRecipesData } from "~/data/dummy-recipes";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Button } from "~/components/ui/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XIcon } from "lucide-nativewind";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function RecipesPage() {
  const { top } = useSafeAreaInsets();
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
      <Animated.View
        entering={ZoomIn.springify().delay(1000).duration(100)}
        exiting={ZoomOut}
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
