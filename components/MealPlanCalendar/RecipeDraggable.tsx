import React, { useCallback, useEffect, useRef } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { P } from "~/components/ui/typography";
import type { Recipe } from "~/types/Recipe";
import type { RecipeDragData } from "~/types/MealPlan";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { log } from "~/utils/logger";

interface RecipeDraggableProps {
  /**
   * The recipe data to display and drag
   */
  recipe: Recipe;
  /**
   * Number of servings (defaults to recipe servings or 1)
   */
  servings?: number;
  /**
   * Optional callback when the recipe is pressed without dragging
   */
  onPress?: (recipe: Recipe) => void;
  /**
   * Optional callback when drag starts
   */
  onDragStart?: (data: RecipeDragData) => void;
  /**
   * Optional callback when drag ends successfully
   */
  onDragEnd?: () => void;
}

const SPRING_CONFIG = {
  damping: 15,
  mass: 1,
  stiffness: 300,
};

const SCALE_ACTIVE = 1.05;
const SCALE_INACTIVE = 1;

/**
 * RecipeDraggable Component
 *
 * A draggable recipe card that can be dragged to meal slots in the calendar.
 * Uses react-native-gesture-handler Gesture.Drag for smooth drag-and-drop.
 */
export default function RecipeDraggable({
  recipe,
  servings,
  onPress,
  onDragStart,
  onDragEnd,
}: RecipeDraggableProps) {
  const { dragState, updateDragState } = useMealPlanCalendar();

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadowOpacity = useSharedValue(0);

  // Context to store initial position for gesture calculations
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // Track if this is a drag or just a press
  const isDragGesture = useSharedValue(false);

  // Track if this component is actively dragging to prevent concurrent drags
  const isThisDragActive = useSharedValue(false);
  const dragEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
        dragEndTimeoutRef.current = null;
      }
    };
  }, []);

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

  const handlePress = useCallback(() => {
    if (!isDragGesture.value) {
      handleHapticFeedback();
      onPress?.(recipe);
    }
  }, [recipe, onPress, handleHapticFeedback, isDragGesture]);

  const handleDragStart = useCallback(() => {
    // Prevent concurrent drags - check if another drag is already active
    if (dragState.isDragging && isThisDragActive.value) {
      // This component is already dragging - ignore duplicate start
      return;
    }

    // Another component is dragging - prevent this drag from starting
    if (dragState.isDragging) {
      log.warn("Cannot start drag: Another drag is already in progress");
      return;
    }

    // Mark this component as the active drag source
    isThisDragActive.value = true;

    // Clear any pending drag end timeout
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
      dragEndTimeoutRef.current = null;
    }

    handleHapticFeedback();

    const dragData: RecipeDragData = {
      recipeId: recipe.id,
      recipe,
      servings: servings ?? recipe.servings ?? 1,
    };

    onDragStart?.(dragData);

    // Update global drag state
    updateDragState({
      isDragging: true,
      data: dragData,
    });
  }, [
    recipe,
    servings,
    onDragStart,
    handleHapticFeedback,
    updateDragState,
    dragState.isDragging,
    isThisDragActive,
  ]);

  const handleDragEnd = useCallback(() => {
    isDragGesture.value = false;
    shadowOpacity.value = withSpring(0, SPRING_CONFIG);

    // Notify parent
    onDragEnd?.();

    // Clear any existing timeout to prevent duplicate state resets
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
    }

    // Reset global drag state after a short delay
    // This allows drop zones to process the drop first
    dragEndTimeoutRef.current = setTimeout(() => {
      updateDragState({ isDragging: false, data: undefined, target: undefined });
      isThisDragActive.value = false;
      dragEndTimeoutRef.current = null;
    }, 100);
  }, [isDragGesture, onDragEnd, updateDragState, isThisDragActive]);

  // Drag gesture handler
  const dragGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onStart(() => {
      "worklet";
      isDragGesture.value = false; // Will be set to true if we move beyond threshold
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      "worklet";
      // Check if we've moved beyond threshold to consider this a drag
      if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) {
        if (!isDragGesture.value && !isThisDragActive.value) {
          isDragGesture.value = true;
          runOnJS(handleDragStart)();
        }

        // Only update position if this is the active drag
        if (isThisDragActive.value) {
          // Update position
          translateX.value = contextX.value + event.translationX;
          translateY.value = contextY.value + event.translationY;

          // Scale up and add shadow when dragging
          scale.value = withSpring(SCALE_ACTIVE, SPRING_CONFIG);
          opacity.value = withSpring(0.9, SPRING_CONFIG);
          shadowOpacity.value = withSpring(0.3, SPRING_CONFIG);
        }
      }
    })
    .onEnd(() => {
      "worklet";
      if (isDragGesture.value && isThisDragActive.value) {
        // Animate back to original position
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(SCALE_INACTIVE, SPRING_CONFIG);
        opacity.value = withSpring(1, SPRING_CONFIG);

        runOnJS(handleDragEnd)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: shadowOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    zIndex: isDragGesture.value ? 1000 : 0,
  }));

  return (
    <Animated.View style={[containerAnimatedStyle]}>
      <GestureDetector gesture={dragGesture}>
        <Animated.View style={[shadowStyle]}>
          <Animated.View style={[animatedStyle]}>
            <Pressable
              onPress={handlePress}
              className="bg-card rounded-xl overflow-hidden shadow-sm"
              style={styles.container}
            >
              {/* Recipe Image */}
              <View style={styles.imageContainer}>
                <Image source={{ uri: recipe.imageUrl }} contentFit="cover" style={styles.image} />
                {/* Drag Handle Indicator */}
                <View className="bg-black/20 px-2 py-1 rounded-full absolute top-2 right-2">
                  <P className="text-white text-xs">⋮⋮</P>
                </View>
              </View>

              {/* Recipe Info */}
              <View className="p-3">
                <P
                  className="text-foreground font-urbanist-semibold text-sm min-h-[36px]"
                  numberOfLines={2}
                >
                  {recipe.title}
                </P>
                {recipe.description && (
                  <P className="text-muted-foreground text-xs mt-1" numberOfLines={1}>
                    {recipe.description}
                  </P>
                )}
                <View className="flex flex-row items-center mt-2 gap-2">
                  {recipe.prepMinutes && (
                    <View className="bg-muted px-2 py-1 rounded-full">
                      <P className="text-muted-foreground text-xs">{recipe.prepMinutes}m</P>
                    </View>
                  )}
                  {recipe.difficultyStars && (
                    <View className="bg-muted px-2 py-1 rounded-full">
                      <P className="text-muted-foreground text-xs">
                        {"⭐".repeat(recipe.difficultyStars)}
                      </P>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 100,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
