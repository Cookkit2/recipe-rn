import { Pressable, View, useWindowDimensions } from "react-native";
import { TEST_IDS } from "~/constants/test-ids";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RecipeButton from "~/components/Pantry/RecipeButton";
import AssistantButton from "~/components/Pantry/AssistantButton";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { CURVES } from "~/constants/curves";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import RecipeCategoryButtonGroup from "~/components/Pantry/RecipeCategoryButtonGroup";
import RecipeLists from "~/components/Pantry/RecipeLists";
import { SNAP_THRESHOLD } from "~/constants/pantry";
import { usePantryStore } from "~/store/PantryContext";
import IngredientLists from "~/components/Pantry/IngredientLists";
import { useCallback, useEffect, useState } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import type { usePantryPullSearch } from "~/hooks/usePantryPullSearch";
import { SearchContent } from "~/components/Search/SearchContent";
import { SearchEntrance } from "~/components/Search/SearchEntrance";
import { SearchPreview } from "~/components/Search/SearchPreview";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: 30,
  mass: 1,
  stiffness: 500,
};

export default function PantryWrapper({
  pullSearch,
}: {
  pullSearch: ReturnType<typeof usePantryPullSearch>;
}) {
  const borderRadius = useDeviceCornerRadius();
  const { height: screenHeight } = useWindowDimensions();
  const { top } = useSafeAreaInsets();

  const {
    isRecipeOpen,
    updateRecipeOpen,
    translateY,
    context,
    isGestureActive,
    collapsedHeight,
    expandedHeight,
  } = usePantryStore();

  const [recipesMounted, setRecipesMounted] = useState(isRecipeOpen);
  useEffect(() => {
    if (isRecipeOpen) setRecipesMounted(true);
  }, [isRecipeOpen]);

  // The Babel plugin tracks the closure; dependency arrays warn on native.
  const entranceOffset = useDerivedValue(() => withSpring(isRecipeOpen ? 1 : 0, SPRING_CONFIG));

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  // Pan gesture handler - memoized to avoid recreation on every render
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      isGestureActive.value = true;
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow dragging up (negative values)
      const newTranslateY = context.value.y + event.translationY;
      translateY.value = Math.min(0, Math.max(-expandedHeight + collapsedHeight, newTranslateY));
    })
    .onEnd((event) => {
      isGestureActive.value = false;
      const velocity = event.velocityY;
      const currentPosition = translateY.value;

      // Determine snap target based on velocity and position
      let snapTarget = 0;

      if (velocity < -500) {
        // Fast upward swipe - expand
        snapTarget = -expandedHeight + collapsedHeight;
      } else if (velocity > 500) {
        // Fast downward swipe - collapse
        snapTarget = 0;
      } else {
        // Slow drag - snap to nearest
        if (Math.abs(currentPosition) > SNAP_THRESHOLD) {
          snapTarget = -expandedHeight + collapsedHeight;
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
        isRecipeOpen ? borderRadius - 8 : 0,
        CURVES["expressive.default.spatial"]
      ),
      borderBottomRightRadius: withTiming(
        isRecipeOpen ? borderRadius - 8 : 0,
        CURVES["expressive.default.spatial"]
      ),
      borderTopRightRadius: isRecipeOpen ? borderRadius - 8 : 0,
      borderTopLeftRadius: isRecipeOpen ? borderRadius - 8 : 0,
      marginHorizontal: withTiming(isRecipeOpen ? 8 : 0, CURVES["expressive.default.spatial"]),
      marginTop: withSpring(isRecipeOpen ? 8 : 0, SPRING_CONFIG),
      // Keep spacing in sync with the sheet height, but avoid re-starting a spring on every frame
      marginBottom: isRecipeOpen ? collapsedHeight - translateY.value : 0,
      paddingTop: withSpring(isRecipeOpen ? top - 8 : top, SPRING_CONFIG),
    };
  });

  const closeRecipe = useCallback(() => {
    if (isRecipeOpen) {
      updateRecipeOpen(false);
      translateY.value = withSpring(0, SPRING_CONFIG);
    }
  }, [isRecipeOpen, updateRecipeOpen, translateY]);

  const recipeGroupStyle = useAnimatedStyle(() => {
    const visibleHeight = collapsedHeight - 8 - translateY.value;
    return {
      opacity: entranceOffset.value,
      top: Math.max(0, screenHeight - entranceOffset.value * visibleHeight),
      // Bound the list to the visible drawer instead of extending it offscreen.
      bottom: 0,
    };
  });

  return (
    <View testID={TEST_IDS.home.screen} collapsable={false} className="flex-1 bg-background">
      <Animated.View
        testID="pantry-home-content"
        className="relative flex-1 bg-black rounded-xl"
        style={pullSearch.homeStyle}
      >
        <AnimatedPressable
          className="relative flex-1 bg-background overflow-hidden"
          style={containerStyle}
          onPress={closeRecipe}
        >
          <IngredientLists pullSearch={pullSearch} />
        </AnimatedPressable>

        <RecipeButton />
        <AssistantButton />

        <Animated.View
          testID={TEST_IDS.home.recipeSheet}
          className="absolute left-0 right-0 overflow-hidden"
          pointerEvents={isRecipeOpen ? "auto" : "none"}
          style={[recipeGroupStyle]}
        >
          <GestureDetector gesture={panGesture}>
            <View testID="recipe-sheet-drag-handle">
              <View className="bg-muted/80 h-1 w-16 rounded-full self-center mb-2" />
              <RecipeCategoryButtonGroup />
            </View>
          </GestureDetector>
          {recipesMounted && <RecipeLists active={isRecipeOpen} />}
        </Animated.View>
      </Animated.View>
      <SearchEntrance
        offset={pullSearch.searchOffset}
        progress={pullSearch.progress}
        interactive={pullSearch.focusEnabled}
      >
        {pullSearch.phase === "open" || pullSearch.phase === "closing" ? (
          <SearchContent
            onDismiss={pullSearch.dismiss}
            focusEnabled={pullSearch.focusEnabled}
            transparent
          />
        ) : (
          <SearchPreview />
        )}
      </SearchEntrance>
    </View>
  );
}
