import React, { useCallback, useRef } from "react";
import { View, Pressable, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { P } from "~/components/ui/typography";
import type {
  CalendarMealPlan,
  MealSlot as MealSlotType,
  CalendarDropTarget,
} from "~/types/MealPlan";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { log } from "~/utils/logger";

// Debounce time for drop actions to prevent rapid-fire drops
const DROP_DEBOUNCE_MS = 300;

interface MealSlotProps {
  /**
   * The date for this meal slot
   */
  date: Date;
  /**
   * The meal slot type (breakfast, lunch, dinner, snack)
   */
  mealSlot: MealSlotType;
  /**
   * The meal plan data if a recipe is assigned to this slot
   */
  mealPlan?: CalendarMealPlan;
  /**
   * Optional callback when the slot is pressed
   */
  onPress?: (date: Date, mealSlot: MealSlotType) => void;
  /**
   * Optional callback when a recipe is dropped on this slot
   */
  onDrop?: (date: Date, mealSlot: MealSlotType) => void;
}

/**
 * MealSlot Component
 *
 * Displays an individual meal slot in the calendar.
 * Shows planned recipe or empty state with drop zone visual for drag-and-drop.
 */
export default function MealSlot({ date, mealSlot, mealPlan, onPress, onDrop }: MealSlotProps) {
  const { dragState, updateDragState } = useMealPlanCalendar();

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isHovered = useSharedValue(false);

  // Debounce tracking for drop actions
  const lastDropTimeRef = useRef<number>(0);
  const isProcessingDropRef = useRef(false);

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

  const handlePress = useCallback(() => {
    // Don't handle press if a drag is active
    if (dragState.isDragging) {
      return;
    }
    handleHapticFeedback();
    onPress?.(date, mealSlot);
  }, [date, mealSlot, onPress, handleHapticFeedback, dragState.isDragging]);

  const isValidDrop = useCallback((): boolean => {
    // Check if a drag is active
    if (!dragState.isDragging) {
      log.warn("Invalid drop: No active drag");
      return false;
    }

    // Check if drag data exists
    if (!dragState.data) {
      log.warn("Invalid drop: No drag data");
      return false;
    }

    // Check if this slot already has the same meal plan
    if (mealPlan) {
      const currentRecipeId = "recipeId" in mealPlan ? mealPlan.recipeId : undefined;

      if (currentRecipeId && "recipeId" in dragState.data) {
        if (currentRecipeId === dragState.data.recipeId) {
          log.warn("Invalid drop: Recipe already assigned to this slot");
          return false;
        }
      }
    }

    return true;
  }, [dragState.isDragging, dragState.data, mealPlan]);

  const handleDrop = useCallback(() => {
    // Debounce check: prevent rapid drops
    const now = Date.now();
    if (now - lastDropTimeRef.current < DROP_DEBOUNCE_MS) {
      log.warn("Drop rejected: Debounce limit exceeded");
      return;
    }

    // Check if already processing a drop
    if (isProcessingDropRef.current) {
      log.warn("Drop rejected: Already processing drop");
      return;
    }

    // Validate the drop
    if (!isValidDrop()) {
      return;
    }

    // Mark as processing and update last drop time
    isProcessingDropRef.current = true;
    lastDropTimeRef.current = now;

    handleHapticFeedback();
    onDrop?.(date, mealSlot);

    // Reset processing flag after debounce period
    setTimeout(() => {
      isProcessingDropRef.current = false;
    }, DROP_DEBOUNCE_MS);
  }, [date, mealSlot, onDrop, handleHapticFeedback, isValidDrop]);

  // Drop zone gesture - detects when something is being dragged over this slot
  const dropZoneGesture = Gesture.LongPress()
    .minDuration(0)
    .onStart(() => {
      "worklet";
      // Only show hover state if a drag is active
      if (dragState.isDragging && !isProcessingDropRef.current) {
        isHovered.value = true;
        scale.value = withSpring(1.05, { damping: 15, stiffness: 150 });
        opacity.value = withSpring(0.8, { damping: 15, stiffness: 150 });
      }
    })
    .onEnd(() => {
      "worklet";
      // Only process drop if we were hovered and not already processing
      if (dragState.isDragging && isHovered.value && !isProcessingDropRef.current) {
        // Update drag state with target
        const target: CalendarDropTarget = { date, mealSlot };
        updateDragState({ ...dragState, target });
        runOnJS(handleDrop)();
      }
      isHovered.value = false;
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor:
      isHovered.value && dragState.isDragging ? "rgba(var(--primary), 0.1)" : "transparent",
  }));

  return (
    <GestureDetector gesture={dropZoneGesture}>
      <Animated.View style={[containerAnimatedStyle]}>
        <Pressable
          onPress={handlePress}
          className="min-h-20 border-b border-border px-2 py-2 justify-center"
        >
          <Animated.View style={[animatedStyle]}>
            {mealPlan ? (
              <View className="bg-primary/10 rounded-lg p-2">
                <P className="text-xs font-urbanist-medium text-muted-foreground capitalize">
                  {mealSlot}
                </P>
                <P
                  className="text-sm font-urbanist-semibold text-foreground mt-1"
                  numberOfLines={2}
                >
                  {mealPlan.recipe?.title || "Recipe"}
                </P>
                {mealPlan.servings > 1 && (
                  <P className="text-xs text-muted-foreground mt-1">{mealPlan.servings} servings</P>
                )}
              </View>
            ) : (
              <View className="h-full items-center justify-center">
                <P className="text-xs text-muted-foreground/40 capitalize text-center">
                  {mealSlot}
                </P>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
