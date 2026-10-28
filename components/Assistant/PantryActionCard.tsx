import { useState } from "react";
import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  additionReceipt,
  type PantryAction,
  type PantryAdditionReceipt,
} from "~/lib/agent/pantry-action";

const LABELS = {
  added: "Added to pantry",
  updated: "Pantry updated",
  renamed: "Ingredient renamed",
  merged: "Pantry entries combined",
  removed: "Removed from pantry",
};
export function PantryActionCard({
  action,
  onUndo,
  onViewPantry,
}: {
  action: PantryAction;
  onUndo?: (receipt: PantryAdditionReceipt) => Promise<void>;
  onViewPantry?: () => void;
}) {
  const [localState, setState] = useState<"ready" | "undoing" | "undone" | "error">("ready");
  const state = action.undone ? "undone" : localState;
  const receipt = additionReceipt(action);
  return (
    <View className="rounded-2xl bg-card p-4 gap-2" testID="assistant-pantry-result">
      <Text className="font-urbanist-semibold">
        {state === "undone" ? "Addition undone" : LABELS[action.status]}
      </Text>
      {action.items.map((item) => (
        <View key={item.id} className="flex-row justify-between gap-3">
          <Text className="flex-1 font-urbanist-medium">{item.name}</Text>
          <Text className="font-urbanist-medium text-muted-foreground">
            {item.quantity} {item.unit}
            {item.storageType ? ` · ${item.storageType}` : ""}
          </Text>
        </View>
      ))}
      {state === "error" ? (
        <Text className="text-sm text-destructive">
          Couldn’t undo this change. Review the current item in Pantry.
        </Text>
      ) : null}
      <View className="flex-row gap-2 -ml-3">
        {onViewPantry ? (
          <Button variant="ghost" size="sm" onPress={onViewPantry}>
            <Text className="font-urbanist-semibold text-sm">View pantry</Text>
          </Button>
        ) : null}
        {receipt && onUndo && state !== "undone" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={state === "undoing"}
            accessibilityLabel="Undo pantry addition"
            onPress={async () => {
              if (state === "undoing") return;
              setState("undoing");
              try {
                await onUndo(receipt);
                setState("undone");
              } catch {
                setState("error");
              }
            }}
          >
            <Text className="font-urbanist-semibold text-sm">
              {state === "undoing" ? "Undoing…" : "Undo"}
            </Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}
