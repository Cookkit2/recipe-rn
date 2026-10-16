import React, { useCallback, useRef } from "react";
import { View, Pressable, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { P } from "~/components/ui/typography";
import type {
  CalendarMealPlan,
  MealSlot as MealSlotType,
  CalendarDropTarget,
} from "~/types/MealPlan";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { log } from "~/utils/logger";
import MealPlanEntryEditor from "./MealPlanEntryEditor";
import { useState } from "react";
import { useSelectionHaptic } from "~/hooks/useSelectionHaptic";

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
  mealPlans?: CalendarMealPlan[];
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
function useMealSlotDrop({
  date,
  mealSlot,
  mealPlans = [],
  onDrop,
}: Pick<MealSlotProps, "date" | "mealSlot" | "mealPlans" | "onDrop">) {
  const { dragState, updateDragState } = useMealPlanCalendar();

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isHovered = useSharedValue(false);

  // Debounce tracking for drop actions
  const lastDropTimeRef = useRef<number>(0);
  const isProcessingDropRef = useRef(false);

  const handleHapticFeedback = useSelectionHaptic();

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

    if (
      "recipeId" in dragState.data &&
      mealPlans.some((plan) => plan.recipeId === (dragState.data as { recipeId: string }).recipeId)
    )
      return false;

    return true;
  }, [dragState.isDragging, dragState.data, mealPlans]);

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
    .enabled(dragState.isDragging)
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
        runOnJS(updateDragState)({ ...dragState, target });
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
    opacity: isHovered.value && dragState.isDragging ? 0.95 : 1,
  }));

  return {
    isDragging: dragState.isDragging,
    dropZoneGesture,
    animatedStyle,
    containerAnimatedStyle,
  };
}

function PlannedMealContent({
  mealSlot,
  mealPlan,
}: {
  mealSlot: MealSlotType;
  mealPlan: CalendarMealPlan;
}) {
  return (
    <View className="bg-primary/10 rounded-lg p-2">
      <P className="text-xs font-urbanist-medium text-muted-foreground capitalize">{mealSlot}</P>
      <P className="text-sm font-urbanist-semibold text-foreground mt-1" numberOfLines={2}>
        {mealPlan.recipe?.title || "Recipe"}
      </P>
      {mealPlan.servings > 1 && (
        <P className="text-xs text-muted-foreground mt-1">{mealPlan.servings} servings</P>
      )}
    </View>
  );
}

function EmptyMealContent({ mealSlot }: { mealSlot: MealSlotType }) {
  return (
    <View className="items-center justify-center">
      <P className="text-xs text-muted-foreground/40 capitalize text-center">{mealSlot}</P>
    </View>
  );
}

/**
 * MealSlot Component
 *
 * Displays an individual meal slot in the calendar.
 * Shows planned recipe or empty state with drop zone visual for drag-and-drop.
 */
export default function MealSlot({
  date,
  mealSlot,
  mealPlans = [],
  onPress,
  onDrop,
}: MealSlotProps) {
  const [editing, setEditing] = useState<CalendarMealPlan | null>(null);
  const { isDragging, dropZoneGesture, animatedStyle, containerAnimatedStyle } = useMealSlotDrop({
    date,
    mealSlot,
    mealPlans,
    onDrop,
  });

  const handleHapticFeedback = useSelectionHaptic();

  const handlePress = useCallback(() => {
    // Don't handle press if a drag is active
    if (isDragging) {
      return;
    }
    handleHapticFeedback();
    onPress?.(date, mealSlot);
  }, [date, mealSlot, onPress, handleHapticFeedback, isDragging]);

  return (
    <GestureDetector gesture={dropZoneGesture}>
      <Animated.View style={[containerAnimatedStyle]}>
        <Pressable
          onPress={handlePress}
          accessible={mealPlans.length === 0}
          accessibilityRole={mealPlans.length === 0 ? "button" : undefined}
          accessibilityLabel={
            mealPlans.length === 0 ? `Add ${mealSlot} on ${date.toLocaleDateString()}` : undefined
          }
          className="min-h-20 border-b border-border px-2 py-2 justify-center"
        >
          <Animated.View style={[animatedStyle]}>
            {mealPlans.length > 0 ? (
              <View className="gap-2">
                {mealPlans.map((plan) => (
                  <Pressable
                    key={plan.id}
                    onPress={() => setEditing(plan)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${plan.recipe?.title ?? "meal"}`}
                  >
                    <PlannedMealContent mealSlot={mealSlot} mealPlan={plan} />
                  </Pressable>
                ))}
                <Pressable
                  onPress={handlePress}
                  accessibilityRole="button"
                  accessibilityLabel={`Add another dish to ${mealSlot}`}
                >
                  <P className="text-xs text-muted-foreground">+ Add dish</P>
                </Pressable>
              </View>
            ) : (
              <EmptyMealContent mealSlot={mealSlot} />
            )}
          </Animated.View>
        </Pressable>
        {editing && <MealPlanEntryEditor meal={editing} onClose={() => setEditing(null)} />}
      </Animated.View>
    </GestureDetector>
  );
}
