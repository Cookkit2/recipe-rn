import { Alert, Pressable, View } from "react-native";
import { Trash2Icon } from "lucide-uniwind";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRecordWaste } from "~/hooks/queries/useWasteAnalyticsQueries";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P } from "~/components/ui/typography";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";

type WasteReason = "expired" | "spoiled" | "excess" | "accidental" | null;

const WASTE_REASONS: Array<{ value: WasteReason; label: string; description: string }> = [
  { value: "expired", label: "Expired", description: "Past its expiration date" },
  { value: "spoiled", label: "Spoiled", description: "Went bad before expiration" },
  { value: "excess", label: "Too Much", description: "Had more than needed" },
  { value: "accidental", label: "Accidental", description: "Dropped, lost, or other" },
];

export default function IngredientDiscardButton() {
  const router = useRouter();
  const { pantryItem: item } = useIngredientDetailStore();
  const recordWaste = useRecordWaste();

  const onDiscard = (reason: WasteReason) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert("Mark as Discarded", `Are you sure you want to mark ${item.name} as discarded?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          recordWaste.mutate(
            {
              stockId: item.id,
              quantityWasted: item.quantity,
              data: {
                reason: reason || undefined,
                wasteDate: Date.now(),
              },
            },
            {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              },
            }
          );
        },
      },
    ]);
  };

  const handleDiscardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show reason selection
    Alert.alert("Why discard?", "Select a reason for discarding this ingredient", [
      { text: "Cancel", style: "cancel" },
      { text: "Expired", onPress: () => onDiscard("expired") },
      { text: "Spoiled", onPress: () => onDiscard("spoiled") },
      { text: "Too Much", onPress: () => onDiscard("excess") },
      { text: "Other", onPress: () => onDiscard("accidental") },
    ]);
  };

  return (
    <Card className="mx-6 mb-6 rounded-3xl shadow-md shadow-foreground/10 border-none bg-destructive/5">
      <CardContent className="p-5">
        <Pressable
          onPress={handleDiscardPress}
          className="flex-row items-center gap-3"
          disabled={recordWaste.isPending}
          accessibilityLabel="Mark ingredient as discarded"
          accessibilityRole="button"
        >
          <View className="w-10 h-10 rounded-full bg-destructive/20 items-center justify-center">
            <Trash2Icon className="text-destructive" size={20} strokeWidth={2.618} />
          </View>
          <View className="flex-1">
            <H4 className="font-urbanist-semibold text-destructive">Mark as Discarded</H4>
            <P className="text-sm text-muted-foreground">Track as waste</P>
          </View>
        </Pressable>
      </CardContent>
    </Card>
  );
}
