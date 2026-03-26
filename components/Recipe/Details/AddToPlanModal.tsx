import React, { useState, useCallback } from "react";
import {
  View,
  Pressable,
  Platform,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { type MealSlot } from "~/types/MealPlan";
import { Button } from "~/components/ui/button";
import { H2, H3, H4, Muted, P } from "~/components/ui/typography";
import { Card, CardContent } from "~/components/ui/card";
import SegmentedButtons, { type GroupButton } from "~/components/Shared/SegmentedButtons";
import {
  CalendarIcon,
  ClockIcon,
  SunIcon,
  UtensilsCrossedIcon,
  MoonIcon,
  AppleIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-uniwind";
import { log } from "~/utils/logger";
import { SlidingNumber } from "~/components/Shared/SlidingNumber";
import { Separator } from "~/components/ui/separator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextShimmer from "~/components/ui/TextShimmer";

interface AddToPlanModalProps {
  /**
   * The recipe ID to add to the meal plan
   */
  recipeId: string;
}

const MEAL_SLOT_OPTIONS: GroupButton<MealSlot>[] = [
  { label: "Breakfast", icon: <SunIcon />, value: "breakfast" },
  { label: "Lunch", icon: <UtensilsCrossedIcon />, value: "lunch" },
  { label: "Dinner", icon: <MoonIcon />, value: "dinner" },
  { label: "Snack", icon: <AppleIcon />, value: "snack" },
];

/**
 * AddToPlanModal Component
 *
 * A modal sheet for selecting a date and meal slot before adding a recipe to the meal plan.
 * This replaces the simple add/remove toggle with a more detailed calendar-based selection.
 */
export default function AddToPlanModal({ recipeId }: AddToPlanModalProps) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { data: recipe } = useRecipe(recipeId);
  const addToMealPlan = useAddToMealPlan();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot>("dinner");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [servings, setServings] = useState(recipe?.servings ?? 2);

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowDatePicker(false);
      }
      if (selectedDate) {
        setSelectedDate(selectedDate);
        handleHapticFeedback();
      }
    },
    [handleHapticFeedback]
  );

  const handleAddToPlan = useCallback(async () => {
    try {
      handleHapticFeedback();

      // Normalize date to start of day for consistent storage
      const normalizedDate = new Date(selectedDate);
      normalizedDate.setHours(0, 0, 0, 0);

      await addToMealPlan.mutateAsync({
        recipeId,
        servings,
        date: normalizedDate,
        mealSlot: selectedMealSlot,
      });

      handleHapticFeedback();
      router.back();
    } catch (error) {
      log.error("Error adding recipe to meal plan:", error);
    }
  }, [
    recipeId,
    selectedDate,
    selectedMealSlot,
    recipe,
    addToMealPlan,
    router,
    handleHapticFeedback,
  ]);

  const handleClose = useCallback(() => {
    handleHapticFeedback();
    router.back();
  }, [handleHapticFeedback, router]);

  const handleMealSlotChange = useCallback(
    (slot: MealSlot) => {
      setSelectedMealSlot(slot);
      handleHapticFeedback();
    },
    [handleHapticFeedback]
  );

  const renderDatePicker = () => {
    if (Platform.OS === "ios") {
      return (
        <Modal visible={showDatePicker} transparent={true} animationType="slide">
          <View className="flex-1 justify-end">
            <View className="bg-background rounded-t-3xl py-5 flex items-center shadow-md">
              <View className="w-full flex-row justify-between items-center border-b border-border pb-3 px-5">
                <Pressable className="flex-1" onPress={() => setShowDatePicker(false)}>
                  <P className="text-foreground/80">Cancel</P>
                </Pressable>
                <View className="flex-2 flex items-center justify-center">
                  <H4>Select Date</H4>
                </View>
                <Pressable className="flex-1 items-end" onPress={() => setShowDatePicker(false)}>
                  <P className="text-foreground/80">Done</P>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      );
    } else {
      return (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: recipe?.title || "Recipe",

          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: true,
        }}
      />
      {renderDatePicker()}
      <ScrollView
        className="bg-background"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Card className="mx-6 mt-4 border-none shadow-none">
          <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
            <View className="gap-1">
              <H4 className="font-urbanist-bold">Servings</H4>
            </View>
            <View className="flex-row items-center justify-center gap-4 mt-4">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                enableDebounce={false}
                disabled={servings <= 1}
                onPress={() => servings > 1 && setServings(servings - 1)}
                accessibilityLabel="Decrease servings"
              >
                <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
              </Button>
              <Separator orientation="vertical" />
              <View className="flex-row gap-1">
                <SlidingNumber value={servings} />
                <P className="font-urbanist-semibold text-foreground/80 pt-1">servings</P>
              </View>
              <Separator orientation="vertical" />
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                enableDebounce={false}
                onPress={() => setServings(servings + 1)}
                accessibilityLabel="Increase servings"
              >
                <PlusIcon className="text-foreground" size={20} strokeWidth={2.618} />
              </Button>
            </View>
          </CardContent>
        </Card>
        {/* Date Selection */}
        <Card className="mx-6 mt-4 border-none shadow-none">
          <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
            <View className="gap-1">
              <H4 className="font-urbanist-bold">Select Date</H4>
            </View>
            <Pressable onPress={() => setShowDatePicker(true)} className="w-full">
              <View className="flex-row items-center gap-3">
                <CalendarIcon size={18} className="text-muted-foreground" />
                <P className="text-lg text-foreground">
                  {format(selectedDate, "EEEE, MMM d, yyyy")}
                </P>
              </View>
            </Pressable>
          </CardContent>
        </Card>

        {/* Meal Slot Selection */}
        <Card className="mx-6 mt-4 border-none shadow-none">
          <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
            <View className="gap-1">
              <H4 className="font-urbanist-bold">Meal Time</H4>
            </View>
            <SegmentedButtons
              columns={2}
              buttons={MEAL_SLOT_OPTIONS}
              value={selectedMealSlot}
              onValueChange={handleMealSlotChange}
            />
          </CardContent>
        </Card>
      </ScrollView>
      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-end items-center"
        style={{ paddingBottom: bottom + 8 }}
      >
        <Button
          size="lg"
          variant="secondary"
          className="rounded-2xl border-continuous bg-foreground/80"
          onPress={handleAddToPlan}
          disabled={addToMealPlan.isPending || !selectedDate || !selectedMealSlot}
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            {addToMealPlan.isPending && <ActivityIndicator />}
            <H4 className="text-background font-urbanist font-semibold">Add to Meal Plan</H4>
          </TextShimmer>
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  datePicker: {
    height: 200,
  },
});
