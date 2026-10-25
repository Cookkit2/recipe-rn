import { useState } from "react";
import { View, FlatList, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H4, P } from "~/components/ui/typography";
import { useLeftovers, useLeftoverActions } from "~/hooks/queries/useLeftovers";
import LeftoverForm from "~/components/Leftovers/LeftoverForm";
import type { Leftover, LeftoverStatus } from "~/types/Leftover";
import useColors from "~/hooks/useColor";

export default function LeftoversPage() {
  const params = useLocalSearchParams<{ recipeId?: string; recipeName?: string; add?: string }>();
  const colors = useColors();
  const [formOpen, setFormOpen] = useState(params.add === "1");
  const [editing, setEditing] = useState<Leftover | undefined>();
  const { data: items = [], isLoading, error, refetch } = useLeftovers();
  const { setStatus } = useLeftoverActions();
  const complete = async (item: Leftover, status: LeftoverStatus) => {
    try {
      await setStatus.mutateAsync({ id: item.id, status });
    } catch {
      toast.error("Couldn't update leftovers. Please try again.");
    }
  };
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerTitle: "Leftovers" }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          tintColor={colors.foreground}
          accessibilityLabel="Add leftovers"
          onPress={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        />
      </Stack.Toolbar>
      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="p-6">
          <P className="font-urbanist-regular">Couldn't load leftovers.</P>
          <Button variant="outline" onPress={() => refetch()}>
            <Text className="font-urbanist-semibold">Try again</Text>
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-12 gap-3">
              <H4 className="font-urbanist-semibold text-center text-muted-foreground">
                No leftovers saved
              </H4>
              <P className="font-urbanist-regular text-center text-sm text-muted-foreground">
                Save a dish and choose when to be reminded.
              </P>
              <Button variant="secondary" onPress={() => setFormOpen(true)}>
                <Text className="font-urbanist-semibold">Add leftovers</Text>
              </Button>
            </View>
          }
          renderItem={({ item }) => (
            <View className="rounded-xl bg-muted/50 p-4 gap-2">
              <P className="font-urbanist-semibold">{item.name}</P>
              <P className="font-urbanist-regular text-xs text-muted-foreground">
                {item.servings} servings · Prepared {item.cookedAt.toLocaleDateString()}
              </P>
              {item.remindAt && (
                <P className="font-urbanist-regular text-xs text-muted-foreground">
                  Reminder:{" "}
                  {item.remindAt.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </P>
              )}
              <View className="flex-row gap-2">
                <Button
                  size="sm"
                  disabled={setStatus.isPending}
                  onPress={() => complete(item, "eaten")}
                >
                  <Text className="font-urbanist-semibold">Eaten</Text>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                >
                  <Text className="font-urbanist-semibold">Edit</Text>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={setStatus.isPending}
                  onPress={() =>
                    Alert.alert("Discard leftovers?", item.name, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Discard",
                        style: "destructive",
                        onPress: () => complete(item, "discarded"),
                      },
                    ])
                  }
                >
                  <Text className="font-urbanist-semibold text-destructive">Discard</Text>
                </Button>
              </View>
            </View>
          )}
        />
      )}
      {formOpen && (
        <LeftoverForm
          item={editing}
          recipeId={params.recipeId}
          recipeName={params.recipeName}
          onClose={() => {
            setFormOpen(false);
            setEditing(undefined);
          }}
        />
      )}
    </View>
  );
}
