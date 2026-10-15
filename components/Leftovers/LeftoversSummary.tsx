import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useLeftovers } from "~/hooks/queries/useLeftovers";
import { P } from "~/components/ui/typography";

export default function LeftoversSummary() {
  const { data: items = [], isLoading, error } = useLeftovers();
  const router = useRouter();
  if (isLoading || error) return null;
  return (
    <Pressable
      onPress={() => router.push("/leftovers")}
      accessibilityRole="button"
      accessibilityLabel={`Leftovers, ${items.length} saved dishes`}
      className="flex-row justify-between items-center rounded-xl bg-muted/50 px-4 py-3 my-3"
    >
      <View className="flex-1">
        <P className="font-urbanist-semibold">
          Leftovers{items.length ? ` · ${items.length}` : ""}
        </P>
        <P className="text-xs text-muted-foreground" numberOfLines={1}>
          {items[0]?.name ?? "Save cooked food for later"}
        </P>
      </View>
      <P className="text-primary">{items.length ? "View" : "Add"}</P>
    </Pressable>
  );
}
