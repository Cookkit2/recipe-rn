import { View, FlatList, ActivityIndicator, Pressable, Alert } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { TrashIcon, CheckCircleIcon, XIcon, Edit2Icon } from "lucide-uniwind";
import { useGroceryList } from "~/hooks/queries/useGroceryList";
import {
  useClearGroceryChecks,
  useClearMealPlan,
  useDeleteGroceryItem,
} from "~/hooks/queries/useMealPlanQueries";
import GroceryListItem from "~/components/GroceryList/GroceryListItem";
import GroceryListHeader from "~/components/GroceryList/GroceryListHeader";
import { Stack } from "expo-router";
import { toast } from "sonner-native";
import { useState } from "react";

export default function GroceryListPage() {
  const { sections, stats, isLoading, isEmpty, hasNeededItems } = useGroceryList();
  const clearChecks = useClearGroceryChecks();
  const clearMealPlan = useClearMealPlan();
  const deleteItem = useDeleteGroceryItem();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemNames, setSelectedItemNames] = useState<Set<string>>(new Set());

  const handleClearChecked = () => {
    clearChecks.mutate(undefined, {
      onSuccess: () => {
        toast.success("Cleared all checked items");
      },
    });
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to clear your entire meal plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearMealPlan.mutate(undefined, {
            onSuccess: () => {
              toast.success("Cleared all planned recipes");
            },
          });
        },
      },
    ]);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItemNames(new Set());
  };

  const toggleItemSelection = (name: string) => {
    const next = new Set(selectedItemNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedItemNames(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedItemNames.size === 0) {
      return;
    }

    Alert.alert(
      "Delete Selected",
      `Are you sure you want to delete ${selectedItemNames.size} items?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete items
            for (const name of selectedItemNames) {
              deleteItem.mutate(name);
            }

            setIsSelectionMode(false);
            setSelectedItemNames(new Set());
            toast.success("Deleted selected items");
          },
        },
      ]
    );
  };

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
        <H3 className="font-bowlby-one text-center mb-2">Grocery list is empty</H3>
        <P className="text-muted-foreground text-center">You haven't added any items yet.</P>
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
        numColumns={2}
        key="grocery-grid"
        ListHeaderComponent={<GroceryListHeader />}
        keyExtractor={(item) => item.normalizedName}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20 }}
        columnWrapperStyle={{ gap: 12 }}
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
