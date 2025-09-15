import { Pressable, View, Dimensions } from "react-native";
import { H1 } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import AddPantryItem from "~/components/Pantry/AddPantryItem";
import RecipeButton from "~/components/Pantry/RecipeButton";
import Animated, {
  Easing,
  SlideInUp,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { CURVES } from "~/constants/curves";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import RecipeCategoryButtonGroup from "~/components/Pantry/RecipeCategoryButtonGroup";
import RecipeLists from "~/components/Pantry/RecipeLists";
import { EXPANDED_HEIGHT, SNAP_THRESHOLD } from "~/constants/pantry";
import { usePantryStore } from "~/store/PantryContext";
import IngredientCategoryButtonGroup from "~/components/Pantry/IngredientCategoryButtonGroup";
import IngredientLists from "~/components/Pantry/IngredientLists";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 30,
  mass: 1,
  stiffness: 500,
};

export default function PantryPage() {
  const borderRadius = useDeviceCornerRadius();
  const { top } = useSafeAreaInsets();

  const {
    isRecipeOpen,
    updateRecipeOpen,
    translateY,
    context,
    isGestureActive,
    collapsedHeight,
  } = usePantryStore();

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isGestureActive.value = true;
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow dragging up (negative values)
      const newTranslateY = context.value.y + event.translationY;
      translateY.value = Math.min(
        0,
        Math.max(-EXPANDED_HEIGHT + collapsedHeight, newTranslateY)
      );
    })
    .onEnd((event) => {
      isGestureActive.value = false;
      const velocity = event.velocityY;
      const currentPosition = translateY.value;

      // Determine snap target based on velocity and position
      let snapTarget = 0;

      if (velocity < -500) {
        // Fast upward swipe - expand
        snapTarget = -EXPANDED_HEIGHT + collapsedHeight;
      } else if (velocity > 500) {
        // Fast downward swipe - collapse
        snapTarget = 0;
      } else {
        // Slow drag - snap to nearest
        if (Math.abs(currentPosition) > SNAP_THRESHOLD) {
          snapTarget = -EXPANDED_HEIGHT + collapsedHeight;
        } else {
          snapTarget = 0;
        }
      }

      translateY.value = withSpring(snapTarget, {
        mass: 1,
        damping: 15,
        stiffness: 300,
      });

      // Update selection state based on position
      const isExpanded = snapTarget < 0;
      runOnJS(updateRecipeOpen)(isExpanded);
    });

  // Update container style to work with pan gesture
  const containerStyle = useAnimatedStyle(() => {
    return {
      borderBottomLeftRadius: withTiming(
        isRecipeOpen ? borderRadius : 0,
        CURVES["expressive.default.spatial"]
      ),
      borderBottomRightRadius: withTiming(
        isRecipeOpen ? borderRadius : 0,
        CURVES["expressive.default.spatial"]
      ),
      borderTopRightRadius: isRecipeOpen ? borderRadius : 0,
      borderTopLeftRadius: isRecipeOpen ? borderRadius : 0,
      marginHorizontal: withTiming(
        isRecipeOpen ? 8 : 0,
        CURVES["expressive.default.spatial"]
      ),
      marginTop: withSpring(isRecipeOpen ? 8 : 0, SPRING_CONFIG),
      marginBottom: withSpring(
        isRecipeOpen ? collapsedHeight - translateY.value : 0,
        SPRING_CONFIG
        // Means the recipe is currently opening
        // The animation need to traverse through a larger screen
        // Thus a longer duration spring is used
        // translateY.value < -1
        //   ? {
        //       damping: 10,
        //       mass: 1,
        //       stiffness: 133.33,
        //     }
        //   : {
        //       damping: 100,
        //       mass: 1,
        //       stiffness: 500,
        //     }
      ),
      paddingTop: withSpring(isRecipeOpen ? top - 8 : top, SPRING_CONFIG),
    };
  });

  const headerGroupStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 16 : 24,
        CURVES["expressive.default.spatial"]
      ),
    };
  });

  const recipeGroupStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(
        isRecipeOpen ? 1 : 0,
        CURVES["expressive.fast.spatial"]
      ),
      top: withSpring(
        isRecipeOpen
          ? SCREEN_HEIGHT - (collapsedHeight - 8 - translateY.value)
          : SCREEN_HEIGHT,
        SPRING_CONFIG
        // translateY.value < -1
        //   ? {
        //       damping: 10,
        //       mass: 1,
        //       stiffness: 133.33,
        //     }
        //   : {
        //       mass: 1,
        //       damping: 25,
        //       stiffness: 500,
        //     }
      ),
    };
  });

  return (
    <Animated.View className="relative flex-1 bg-black">
      <AnimatedPressable
        className="relative flex-1 bg-background overflow-hidden"
        exiting={SlideInUp.duration(1000).easing(Easing.inOut(Easing.quad))}
        style={containerStyle}
        onPress={() => {
          if (isRecipeOpen) {
            updateRecipeOpen(false);
            translateY.value = withSpring(0, {
              damping: 15,
              mass: 1,
              stiffness: 300,
            });
          }
        }}
      >
        <Animated.View
          className="flex-row items-center my-5 gap-3"
          style={headerGroupStyle}
        >
          <H1 className="font-bowlby-one pt-2">Pantry</H1>
          <View className="flex-1" />
          <AddPantryItem />
          <MenuDropdown />
        </Animated.View>
        <IngredientCategoryButtonGroup />
        <IngredientLists />
      </AnimatedPressable>

      <RecipeButton />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="absolute left-0 right-0"
          style={[recipeGroupStyle]}
        >
          <View className="bg-muted/80 h-1 w-16 rounded-full self-center mb-2" />
          <RecipeCategoryButtonGroup />
          <RecipeLists />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
