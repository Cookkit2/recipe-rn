import { Pressable, View, Dimensions, TextInput, Text, ActivityIndicator } from "react-native";
import { useState } from "react";
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
import { useImportYouTubeRecipe, getImportStatusMessage } from "~/hooks/queries/useYouTubeRecipeQueries";

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

  const {
    isRecipeOpen,
    updateRecipeOpen,
    translateY,
    context,
    isGestureActive,
    collapsedHeight,
  } = usePantryStore();

  // YouTube Import Test State
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=K32XDmE778k");
  const { importRecipe, importStatus, data, error, isPending, reset } = useImportYouTubeRecipe();

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
      ),
      paddingTop: withSpring(isRecipeOpen ? top - 8 : top, SPRING_CONFIG),
    };
  }, [isRecipeOpen, collapsedHeight, top]);

  const headerGroupStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 16 : 24,
        CURVES["expressive.default.spatial"]
      ),
    };
  }, [isRecipeOpen]);

  const ingredientListStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 4 : 12,
        CURVES["expressive.default.spatial"]
      ),
    };
  }, [isRecipeOpen]);

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
      ),
    };
  }, [isRecipeOpen, collapsedHeight]);

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

        {/* YouTube Import Test Section */}
        <View className="mx-4 mb-4 p-3 bg-muted rounded-xl">
          <Text className="text-foreground font-semibold mb-2">Test YouTube Import</Text>
          <TextInput
            className="bg-background text-foreground px-3 py-2 rounded-lg mb-2"
            placeholder="Paste YouTube URL..."
            placeholderTextColor="#888"
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="flex-row gap-2">
            <Pressable
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                isPending ? "bg-muted-foreground" : "bg-primary"
              }`}
              onPress={() => importRecipe(youtubeUrl)}
              disabled={isPending || !youtubeUrl.trim()}
            >
              {isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-primary-foreground font-semibold">Import Recipe</Text>
              )}
            </Pressable>
            {(data || error) && (
              <Pressable
                className="px-4 py-2 rounded-lg bg-destructive items-center justify-center"
                onPress={() => {
                  reset();
                  setYoutubeUrl("");
                }}
              >
                <Text className="text-destructive-foreground font-semibold">Clear</Text>
              </Pressable>
            )}
          </View>
          {/* Status Display */}
          {importStatus !== "idle" && (
            <Text className="text-muted-foreground text-sm mt-2">
              {getImportStatusMessage(importStatus)}
            </Text>
          )}
          {/* Success Result */}
          {data?.success && data.recipe && (
            <View className="mt-2 p-2 bg-green-500/20 rounded-lg">
              <Text className="text-green-600 font-semibold">
                Success: {data.recipe.title}
              </Text>
              <Text className="text-green-600 text-sm">
                Missing ingredients: {data.shoppingList?.missingIngredients.length ?? 0}
              </Text>
            </View>
          )}
          {/* Error Display */}
          {(data?.error || error) && (
            <View className="mt-2 p-2 bg-destructive/20 rounded-lg">
              <Text className="text-destructive text-sm">
                {data?.error || error?.message}
              </Text>
            </View>
          )}
        </View>

        <IngredientCategoryButtonGroup />
        <Animated.View style={ingredientListStyle}>
          <IngredientLists />
        </Animated.View>
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
