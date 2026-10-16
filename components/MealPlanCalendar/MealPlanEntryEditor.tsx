import { useState } from "react";
import {
  Modal,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { P, H3 } from "~/components/ui/typography";
import { useMealPlanEntry } from "~/hooks/queries/useMealPlanEntry";
import { MEAL_SLOTS, type CalendarMealPlan } from "~/types/MealPlan";

export default function MealPlanEntryEditor({
  meal,
  onClose,
}: {
  meal: CalendarMealPlan;
  onClose: () => void;
}) {
  const [date, setDate] = useState(meal.date);
  const [slot, setSlot] = useState(meal.mealSlot);
  const [servings, setServings] = useState(String(meal.servings));
  const [showDate, setShowDate] = useState(false);
  const { update, remove } = useMealPlanEntry();
  const router = useRouter();
  const busy = update.isPending || remove.isPending;
  const save = async () => {
    try {
      await update.mutateAsync({ id: meal.id, date, mealSlot: slot, servings: Number(servings) });
      onClose();
    } catch {
      toast.error("Couldn't update this meal. Please try again.");
    }
  };
  const deleteMeal = () =>
    Alert.alert("Remove dish?", "Remove this dish from the meal plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(meal.id);
            onClose();
          } catch {
            toast.error("Couldn't remove this meal.");
          }
        },
      },
    ]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-background rounded-t-3xl p-6 pb-10 gap-4">
          <H3>{meal.recipe?.title ?? "Planned meal"}</H3>
          <Pressable
            onPress={() => setShowDate(!showDate)}
            accessibilityRole="button"
            accessibilityLabel="Choose meal date"
          >
            <P>{date.toLocaleDateString()}</P>
          </Pressable>
          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              onChange={(_, value) => {
                if (value) setDate(value);
                setShowDate(false);
              }}
            />
          )}
          <View className="flex-row flex-wrap gap-2">
            {MEAL_SLOTS.map((value) => (
              <Button
                key={value}
                variant={slot === value ? "default" : "outline"}
                size="sm"
                onPress={() => setSlot(value)}
              >
                <P className="capitalize">{value}</P>
              </Button>
            ))}
          </View>
          <P>Servings</P>
          <TextInput
            accessibilityLabel="Servings"
            value={servings}
            onChangeText={setServings}
            keyboardType="decimal-pad"
            className="rounded-lg border border-border text-foreground px-3 py-2"
          />
          <Button
            onPress={save}
            isLoading={busy}
            disabled={!Number.isFinite(Number(servings)) || Number(servings) <= 0}
          >
            <P>Save meal</P>
          </Button>
          <View className="flex-row justify-between">
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => {
                onClose();
                router.push(`/recipes/${meal.recipeId}`);
              }}
            >
              <P>View recipe</P>
            </Button>
            <Button variant="ghost" disabled={busy} onPress={deleteMeal}>
              <P className="text-destructive">Remove</P>
            </Button>
            <Button variant="ghost" disabled={busy} onPress={onClose}>
              <P>Cancel</P>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
