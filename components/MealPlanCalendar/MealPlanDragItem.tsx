import React, { useCallback } from "react";
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
import type { CalendarMealPlan, MealPlanDragData } from "~/types/MealPlan";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { log } from "~/utils/logger";

interface MealPlanDragItemProps {
  /**
   * The meal plan data to display and drag
   */
  mealPlan: CalendarMealPlan;
  /**
   * Optional callback when the meal plan is pressed without dragging
   */
  onPress?: (mealPlan: CalendarMealPlan) => void;
  /**
   * Optional callback when drag starts
   */
  onDragStart?: (data: MealPlanDragData) => void;
  /**
   * Optional callback when drag ends successfully
   */
  onDragEnd?: () => void;
  /**
   * Whether to show the full recipe image (compact mode by default)
   */
  showImage?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  mass: 1,
  stiffness: 300,
};

const SCALE_ACTIVE = 1.05;
const SCALE_INACTIVE = 1;

/**
 * MealPlanDragItem Component
 *
 * A draggable meal plan item that can be dragged to move planned meals
 * between different slots in the calendar.
 * Uses react-native-gesture-handler Gesture.Drag for smooth drag-and-drop.
 */
export default function MealPlanDragItem({
  mealPlan,
  onPress,
  onDragStart,
  onDragEnd,
  showImage = false,
}: MealPlanDragItemProps) {
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

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

  const handlePress = useCallback(() => {
    if (!isDragGesture.value) {
      handleHapticFeedback();
      onPress?.(mealPlan);
    }
  }, [mealPlan, onPress, handleHapticFeedback, isDragGesture]);

  const handleDragStart = useCallback(() => {
    handleHapticFeedback();

    const dragData: MealPlanDragData = {
      mealPlanId: mealPlan.id,
      currentDate: mealPlan.date,
      currentMealSlot: mealPlan.mealSlot,
    };

    onDragStart?.(dragData);

    // Update global drag state with meal plan info
    updateDragState({
      isDragging: true,
      data: dragData,
    });
  }, [mealPlan, onDragStart, handleHapticFeedback, updateDragState]);

  const handleDragEnd = useCallback(() => {
    isDragGesture.value = false;
    shadowOpacity.value = withSpring(0, SPRING_CONFIG);

    // Notify parent
    onDragEnd?.();

    // Reset global drag state after a short delay
    // This allows drop zones to process the drop first
    setTimeout(() => {
      updateDragState({ isDragging: false });
    }, 100);
  }, [isDragGesture, onDragEnd, updateDragState]);

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
        if (!isDragGesture.value) {
          isDragGesture.value = true;
          runOnJS(handleDragStart)();
        }

        // Update position
        translateX.value = contextX.value + event.translationX;
        translateY.value = contextY.value + event.translationY;

        // Scale up and add shadow when dragging
        scale.value = withSpring(SCALE_ACTIVE, SPRING_CONFIG);
        opacity.value = withSpring(0.9, SPRING_CONFIG);
        shadowOpacity.value = withSpring(0.3, SPRING_CONFIG);
      }
    })
    .onEnd(() => {
      "worklet";
      if (isDragGesture.value) {
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

  if (showImage && mealPlan.recipe?.imageUrl) {
    // Full card view with image
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
                  <Image
                    source={{ uri: mealPlan.recipe.imageUrl }}
                    contentFit="cover"
                    style={styles.image}
                  />
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
                    {mealPlan.recipe?.title || "Recipe"}
                  </P>
                  {mealPlan.recipe?.description && (
                    <P className="text-muted-foreground text-xs mt-1" numberOfLines={1}>
                      {mealPlan.recipe.description}
                    </P>
                  )}
                  <View className="flex flex-row items-center mt-2 gap-2">
                    <View className="bg-primary/20 px-2 py-1 rounded-full">
                      <P className="text-primary text-xs capitalize">{mealPlan.mealSlot}</P>
                    </View>
                    {mealPlan.servings > 1 && (
                      <View className="bg-muted px-2 py-1 rounded-full">
                        <P className="text-muted-foreground text-xs">
                          {mealPlan.servings} servings
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

  // Compact view for calendar slots
  return (
    <Animated.View style={[containerAnimatedStyle]}>
      <GestureDetector gesture={dragGesture}>
        <Animated.View style={[shadowStyle]}>
          <Animated.View style={[animatedStyle]}>
            <Pressable
              onPress={handlePress}
              className="bg-primary/10 rounded-lg p-2"
              style={styles.compactContainer}
            >
              <View className="flex-row items-center gap-2">
                {/* Drag Handle Indicator */}
                <View className="bg-primary/20 px-1 py-1 rounded">
                  <P className="text-primary text-xs">⋮⋮</P>
                </View>
                <View className="flex-1">
                  <P className="text-xs font-urbanist-medium text-muted-foreground capitalize">
                    {mealPlan.mealSlot}
                  </P>
                  <P className="text-sm font-urbanist-semibold text-foreground" numberOfLines={2}>
                    {mealPlan.recipe?.title || "Recipe"}
                  </P>
                  {mealPlan.servings > 1 && (
                    <P className="text-xs text-muted-foreground mt-1">
                      {mealPlan.servings} servings
                    </P>
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
  compactContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
});
