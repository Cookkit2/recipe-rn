import { useState } from "react";
import { Modal, View, ScrollView, Switch, KeyboardAvoidingView, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { toast } from "sonner-native";
import { SymbolView } from "expo-symbols";
import { XIcon } from "lucide-uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H4, P } from "~/components/ui/typography";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useLeftoverActions } from "~/hooks/queries/useLeftovers";
import { defaultLeftoverReminder } from "~/utils/leftovers";
import type { Leftover } from "~/types/Leftover";
import useColors from "~/hooks/useColor";

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
  const { bottom } = useSafeAreaInsets();
  const colors = useColors();
  const [name, setName] = useState(item?.name ?? recipeName ?? "");
  const [servings, setServings] = useState(String(item?.servings ?? 1));
  const [cookedAt, setCookedAt] = useState(item?.cookedAt ?? new Date());
  const [reminderEnabled, setReminderEnabled] = useState(item ? !!item.remindAt : true);
  const [remindAt, setRemindAt] = useState(
    item?.remindAt && item.remindAt > new Date() ? item.remindAt : defaultLeftoverReminder()
  );
  const [picker, setPicker] = useState<"cooked" | "date" | "time" | null>(null);
  const { save } = useLeftoverActions();
  const close = () => {
    if (!save.isPending) onClose();
  };
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
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={!save.isPending}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-background"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="mt-24 mb-4 px-6">
            <H1 className="font-bowlby-one pt-2">{item ? "Edit leftovers" : "Add leftovers"}</H1>
            <P className="font-urbanist-regular text-muted-foreground">
              Save a dish and choose when to be reminded.
            </P>
          </View>

          <Card className="mx-6 mt-4 border-none shadow-none">
            <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
              <H4 className="font-urbanist-bold">Food</H4>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Food name"
                accessibilityLabel="Leftover food name"
                className="text-foreground text-left"
              />
              <P className="font-urbanist-semibold">Servings left</P>
              <Input
                value={servings}
                onChangeText={setServings}
                keyboardType="decimal-pad"
                accessibilityLabel="Servings left"
                className="text-foreground"
              />
              <Button
                variant="ghost"
                className="flex-row justify-between px-0"
                accessibilityLabel="Prepared date"
                onPress={() => setPicker("cooked")}
              >
                <P className="font-urbanist-semibold">Prepared</P>
                <P className="font-urbanist-regular text-muted-foreground">
                  {cookedAt.toLocaleDateString()}
                </P>
              </Button>
            </CardContent>
          </Card>

          <Card className="mx-6 mt-4 border-none shadow-none">
            <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
              <H4 className="font-urbanist-bold">Reminder</H4>
              <View className="flex-row justify-between items-center">
                <P className="font-urbanist-semibold">Remind me</P>
                <Switch
                  accessibilityLabel="Leftover reminder"
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: colors.muted, true: colors.foreground }}
                  thumbColor={colors.background}
                />
              </View>
              {reminderEnabled && (
                <View className="flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    accessibilityLabel="Reminder date"
                    onPress={() => setPicker("date")}
                  >
                    <P className="font-urbanist-semibold">{remindAt.toLocaleDateString()}</P>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    accessibilityLabel="Reminder time"
                    onPress={() => setPicker("time")}
                  >
                    <P className="font-urbanist-semibold">
                      {remindAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </P>
                  </Button>
                </View>
              )}
            </CardContent>
          </Card>
          {picker && (
            <View className="mx-6 mt-4">
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
            </View>
          )}
        </ScrollView>
        <View className="absolute right-6 top-6">
          <Button
            size="icon"
            variant="ghost"
            accessibilityLabel="Close"
            disabled={save.isPending}
            onPress={close}
          >
            {Platform.OS === "ios" ? (
              <SymbolView name="xmark" tintColor={colors.foreground} size={20} />
            ) : (
              <XIcon className="text-foreground" size={20} strokeWidth={2.618} />
            )}
          </Button>
        </View>
        <View
          className="border-t border-border py-3 px-6 bg-background"
          style={{ paddingBottom: Math.max(bottom, 12) }}
        >
          <View className="flex-row items-center justify-between">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6"
              disabled={save.isPending}
              onPress={close}
            >
              <H4 className="font-urbanist-semibold text-foreground">Cancel</H4>
            </Button>
            <Button
              size="lg"
              className="rounded-full px-6"
              accessibilityLabel="Save leftovers"
              onPress={submit}
              isLoading={save.isPending}
            >
              <H4 className="font-urbanist-semibold text-primary-foreground">Save</H4>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
