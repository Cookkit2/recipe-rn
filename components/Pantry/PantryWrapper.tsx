import { Pressable, View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RecipeButton from "~/components/Pantry/RecipeButton";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { CURVES } from "~/constants/curves";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import RecipeCategoryButtonGroup from "~/components/Pantry/RecipeCategoryButtonGroup";
import RecipeLists from "~/components/Pantry/RecipeLists";
import { EXPANDED_HEIGHT, SNAP_THRESHOLD } from "~/constants/pantry";
import { usePantryStore } from "~/store/PantryContext";
import IngredientLists from "~/components/Pantry/IngredientLists";
import { useCallback, useEffect } from "react";
import { setStatusBarStyle } from "expo-status-bar";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 30,
  mass: 1,
  stiffness: 500,
};

export default function PantryWrapper() {
  const borderRadius = useDeviceCornerRadius();
  const { top } = useSafeAreaInsets();

  const { isRecipeOpen, updateRecipeOpen, translateY, context, isGestureActive, collapsedHeight } =
    usePantryStore();

  const entranceOffset = useSharedValue(isRecipeOpen ? 1 : 0);

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  useEffect(() => {
    const target = isRecipeOpen ? 1 : 0;
    scheduleOnUI((t: number) => {
      "worklet";
      entranceOffset.value = withSpring(t, {
        damping: 15,
        mass: 0.8,
        stiffness: 400,
      });
    }, target);
  }, [isRecipeOpen]);

  // Pan gesture handler - memoized to avoid recreation on every render
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isGestureActive.value = true;
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow dragging up (negative values)
      const newTranslateY = context.value.y + event.translationY;
      translateY.value = Math.min(0, Math.max(-EXPANDED_HEIGHT + collapsedHeight, newTranslateY));
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
      scheduleOnRN(updateRecipeOpen, isExpanded);
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
      marginHorizontal: withTiming(isRecipeOpen ? 8 : 0, CURVES["expressive.default.spatial"]),
      marginTop: withSpring(isRecipeOpen ? 8 : 0, SPRING_CONFIG),
      // Keep spacing in sync with the sheet height, but avoid re-starting a spring on every frame
      marginBottom: isRecipeOpen ? collapsedHeight - translateY.value : 0,
      paddingTop: withSpring(isRecipeOpen ? top - 8 : top, SPRING_CONFIG),
    };
  }, [isRecipeOpen, collapsedHeight, top]);

  const closeRecipe = useCallback(() => {
    if (isRecipeOpen) {
      updateRecipeOpen(false);
      translateY.value = withSpring(0, {
        damping: 15,
        mass: 1,
        stiffness: 300,
      });
    }
  }, [isRecipeOpen, updateRecipeOpen, translateY]);

  const recipeGroupStyle = useAnimatedStyle(() => {
    const visibleHeight = collapsedHeight - 8 - translateY.value;
    return {
      opacity: entranceOffset.value,
      // entranceOffset springs 0→1 on open (bounce), 1→0 on close; translateY drives drag directly
      top: SCREEN_HEIGHT - entranceOffset.value * visibleHeight,
    };
  }, [collapsedHeight]);

  return (
    <Animated.View className="relative flex-1 bg-black">
      <AnimatedPressable
        className="relative flex-1 bg-background overflow-hidden"
        style={containerStyle}
        onPress={closeRecipe}
      >
        <IngredientLists />
      </AnimatedPressable>

      <RecipeButton />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="absolute left-0 right-0 h-full"
          pointerEvents={isRecipeOpen ? "auto" : "none"}
          style={[recipeGroupStyle]}
        >
          <View className="bg-muted/80 h-1 w-16 rounded-full self-center mb-2" />
          {/* Invisible touch area overlay for easier grabbing */}
          <View className="absolute top-0 left-0 right-0 h-12" />
          <RecipeCategoryButtonGroup />
          <RecipeLists />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
