import { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { toast } from "sonner-native";
import { H3, P } from "~/components/ui/typography";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useLeftoverActions } from "~/hooks/queries/useLeftovers";
import { defaultLeftoverReminder } from "~/utils/leftovers";
import type { Leftover } from "~/types/Leftover";

export default function LeftoverForm({
  item,
  recipeId,
  recipeName,
  onClose,
}: {
  item?: Leftover;
  recipeId?: string;
  recipeName?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? recipeName ?? "");
  const [servings, setServings] = useState(String(item?.servings ?? 1));
  const [cookedAt, setCookedAt] = useState(item?.cookedAt ?? new Date());
  const [reminderEnabled, setReminderEnabled] = useState(item ? !!item.remindAt : true);
  const [remindAt, setRemindAt] = useState(
    item?.remindAt && item.remindAt > new Date() ? item.remindAt : defaultLeftoverReminder()
  );
  const [picker, setPicker] = useState<"cooked" | "date" | "time" | null>(null);
  const { save } = useLeftoverActions();
  const submit = async () => {
    try {
      const result = await save.mutateAsync({
        id: item?.id,
        input: {
          name,
          servings: Number(servings),
          cookedAt,
          recipeId: item?.recipeId ?? recipeId,
          remindAt: reminderEnabled ? remindAt : undefined,
        },
      });
      onClose();
      toast.success(
        reminderEnabled && !result.reminderScheduled
          ? "Saved. Reminder isn't scheduled; check notification settings."
          : "Leftovers saved"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save leftovers");
    }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/40"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          className="bg-background rounded-t-3xl max-h-[85%]"
          contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
        >
          <H3>{item ? "Edit leftovers" : "Save leftovers"}</H3>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Food name"
            accessibilityLabel="Leftover food name"
          />
          <P>Servings left</P>
          <Input
            value={servings}
            onChangeText={setServings}
            keyboardType="decimal-pad"
            accessibilityLabel="Servings left"
          />
          <Pressable onPress={() => setPicker("cooked")} accessibilityRole="button">
            <P>Prepared {cookedAt.toLocaleDateString()}</P>
          </Pressable>
          <View className="flex-row justify-between items-center">
            <P>Remind me</P>
            <Switch
              accessibilityLabel="Leftover reminder"
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
            />
          </View>
          {reminderEnabled && (
            <View className="flex-row gap-3">
              <Button variant="outline" onPress={() => setPicker("date")}>
                <P>{remindAt.toLocaleDateString()}</P>
              </Button>
              <Button variant="outline" onPress={() => setPicker("time")}>
                <P>
                  {remindAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </P>
              </Button>
            </View>
          )}
          {picker && (
            <DateTimePicker
              value={picker === "cooked" ? cookedAt : remindAt}
              maximumDate={picker === "cooked" ? new Date() : undefined}
              mode={picker === "time" ? "time" : "date"}
              onChange={(_, value) => {
                if (value) {
                  if (picker === "cooked") {
                    const date = new Date(value);
                    date.setHours(0, 0, 0, 0);
                    setCookedAt(date);
                  } else if (picker === "date")
                    setRemindAt(
                      new Date(
                        value.getFullYear(),
                        value.getMonth(),
                        value.getDate(),
                        remindAt.getHours(),
                        remindAt.getMinutes()
                      )
                    );
                  else
                    setRemindAt(
                      new Date(
                        remindAt.getFullYear(),
                        remindAt.getMonth(),
                        remindAt.getDate(),
                        value.getHours(),
                        value.getMinutes()
                      )
                    );
                }
                setPicker(null);
              }}
            />
          )}
          <Button onPress={submit} isLoading={save.isPending}>
            <P>Save leftovers</P>
          </Button>
          <Button variant="ghost" disabled={save.isPending} onPress={onClose}>
            <P>Cancel</P>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
