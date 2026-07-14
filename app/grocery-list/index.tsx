import { View, FlatList, ActivityIndicator, Pressable } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { TrashIcon, CheckCircleIcon, XIcon, Edit2Icon, ShoppingCartIcon } from "lucide-uniwind";
import { useGroceryList } from "~/hooks/queries/useGroceryList";
import { useGroceryListActions } from "~/hooks/useGroceryListActions";
import GroceryListItem from "~/components/GroceryList/GroceryListItem";
import GroceryListHeader from "~/components/GroceryList/GroceryListHeader";
import { Stack, Link } from "expo-router";

export default function GroceryListPage() {
  const { sections, stats, isLoading, isEmpty, hasNeededItems } = useGroceryList();
  const {
    isSelectionMode,
    selectedItemNames,
    handleClearChecked,
    handleClearAll,
    toggleSelectionMode,
    toggleItemSelection,
    handleDeleteSelected,
  } = useGroceryListActions();

  const allItems = sections.flatMap((section) => section.items);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading grocery list...</P>
      </View>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <View className="w-24 h-24 rounded-full bg-muted items-center justify-center mb-6">
          <ShoppingCartIcon className="text-muted-foreground" size={48} strokeWidth={1.5} />
        </View>
        <H3 className="font-bowlby-one text-center mb-2">Your list is empty</H3>
        <P className="text-muted-foreground text-center max-w-xs mb-8">
          Add recipes to your meal plan, and the ingredients you need will appear here.
        </P>
        <Link href="/meal-plan" asChild>
          <Button variant="default" className="bg-foreground">
            <P className="font-urbanist-semibold text-background">Plan Meals</P>
          </Button>
        </Link>
      </View>
    );
  }

  // All items covered/checked state
  if (!hasNeededItems || stats.allCheckedOrCovered) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <View className="items-center">
          <View className="w-24 h-24 rounded-full bg-green-500/20 items-center justify-center mb-6">
            <CheckCircleIcon className="text-green-500" size={48} strokeWidth={1.5} />
          </View>

          <H3 className="font-bowlby-one text-center mb-2">You're all set! 🎉</H3>
          <P className="text-muted-foreground text-center max-w-xs">
            You have all the ingredients you need, or you've checked everything off your list.
          </P>

          <View className="flex-row gap-3 mt-8">
            <Button variant="outline" onPress={handleClearChecked}>
              <P className="font-urbanist-semibold">Uncheck All</P>
            </Button>
            <Button variant="default" className="bg-foreground" onPress={handleClearAll}>
              <P className="font-urbanist-semibold text-background">Clear Plan</P>
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          unstable_headerRightItems: () =>
            isSelectionMode
              ? [
                  {
                    type: "custom",
                    element: (
                      <Pressable
                        onPress={toggleSelectionMode}
                        className="px-1.5"
                        accessibilityRole="button"
                        accessibilityLabel="Cancel selection"
                        accessibilityHint="Exits selection mode without deleting items"
                      >
                        <XIcon className="text-muted-foreground" size={24} />
                      </Pressable>
                    ),
                  },
                  {
                    type: "custom",
                    element: (
                      <Pressable
                        onPress={handleDeleteSelected}
                        className="px-1.5"
                        accessibilityRole="button"
                        accessibilityLabel="Delete selected items"
                        accessibilityHint="Permanently deletes the selected items"
                      >
                        <TrashIcon className="text-destructive" size={24} />
                      </Pressable>
                    ),
                  },
                ]
              : [
                  {
                    type: "custom",
                    element: (
                      <Pressable
                        onPress={toggleSelectionMode}
                        className="px-1.5"
                        accessibilityRole="button"
                        accessibilityLabel="Edit selection mode"
                        accessibilityHint="Enables selection mode to delete multiple items"
                      >
                        <Edit2Icon className="text-foreground" size={24} />
                      </Pressable>
                    ),
                  },
                ],
          headerTitle: isSelectionMode ? `${selectedItemNames.size} Selected` : "Grocery List",
        }}
      />
      <FlatList
        data={allItems}
        ListHeaderComponent={<GroceryListHeader />}
        keyExtractor={(item) => item.normalizedName}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 32 }}
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GroceryListItem
            item={item}
            isSelectionMode={isSelectionMode}
            isSelected={selectedItemNames.has(item.normalizedName)}
            onToggleSelect={() => toggleItemSelection(item.normalizedName)}
          />
        )}
      />
    </>
  );
}
