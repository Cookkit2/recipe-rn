import { useState, type ReactNode } from "react";
import { View, FlatList, ActivityIndicator, Pressable } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { TrashIcon, CheckCircleIcon, XIcon, Edit2Icon, ShoppingCartIcon } from "lucide-uniwind";
import { useGroceryList } from "~/hooks/queries/useGroceryList";
import { useGroceryListActions } from "~/hooks/useGroceryListActions";
import GroceryListItem from "~/components/GroceryList/GroceryListItem";
import GroceryListHeader from "~/components/GroceryList/GroceryListHeader";
import { Stack, Link } from "expo-router";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { WeekNavigationHeader } from "~/app/meal-plan/components/WeekNavigationHeader";
import { toast } from "sonner-native";
import { shopForIngredients, type IngredientShoppingProvider } from "~/lib/ingredient-shopping";

export default function GroceryListPage() {
  const { selectedWeek, changeSelectedWeek } = useMealPlanCalendar();
  const { sections, stats, isLoading, isEmpty, hasNeededItems, error, refetch } = useGroceryList();
  const {
    isSelectionMode,
    selectedItemNames,
    handleClearChecked,
    handleClearAll,
    toggleSelectionMode,
    toggleItemSelection,
    handleDeleteSelected,
  } = useGroceryListActions();
  const [isOpeningStore, setIsOpeningStore] = useState(false);

  const allItems = sections.flatMap((section) => section.items);
  const hasRemainingItems = allItems.some(
    (item) => !item.isChecked && !item.isCovered && item.neededQuantity > 0
  );

  const handleShopForIngredients = async (provider: IngredientShoppingProvider) => {
    if (isOpeningStore) return;
    setIsOpeningStore(true);

    try {
      const result = await shopForIngredients(provider, allItems);
      switch (result) {
        case "empty":
          toast("No items left to buy");
          break;
        case "opened":
          toast.success("List copied");
          break;
        case "copied":
          toast.error(
            `List copied. Open ${provider === "grabmart" ? "GrabMart" : "foodpanda"} to shop.`
          );
          break;
      }
    } catch {
      toast.error("Couldn't copy your list. Please try again.");
    } finally {
      setIsOpeningStore(false);
    }
  };

  const weekNavigation = (
    <WeekNavigationHeader
      selectedWeek={selectedWeek}
      onPreviousWeek={() => {
        const day = new Date(selectedWeek);
        day.setDate(day.getDate() - 7);
        changeSelectedWeek(day);
      }}
      onNextWeek={() => {
        const day = new Date(selectedWeek);
        day.setDate(day.getDate() + 7);
        changeSelectedWeek(day);
      }}
      onGoToToday={() => changeSelectedWeek(new Date())}
    />
  );
  if (error)
    return (
      <GroceryListState header={weekNavigation}>
        <P>Couldn't load the shopping list.</P>
        <Button variant="outline" onPress={() => refetch()}>
          <P>Try again</P>
        </Button>
      </GroceryListState>
    );

  // Loading state
  if (isLoading) {
    return (
      <GroceryListState header={weekNavigation}>
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading grocery list...</P>
      </GroceryListState>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <GroceryListState header={weekNavigation}>
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
      </GroceryListState>
    );
  }

  // All items covered/checked state
  if (!hasNeededItems || stats.allCheckedOrCovered) {
    return (
      <GroceryListState header={weekNavigation}>
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
      </GroceryListState>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
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
      {weekNavigation}
      <FlatList
        data={allItems}
        ListHeaderComponent={
          <>
            {hasRemainingItems && !isSelectionMode && (
              <View className="px-5 mb-6">
                <View className="flex-row gap-2">
                  {(["grabmart", "foodpanda"] as const).map((provider) => (
                    <Button
                      key={provider}
                      variant="outline"
                      containerClassName="flex-1"
                      onPress={() => handleShopForIngredients(provider)}
                      disabled={isOpeningStore}
                      accessibilityLabel={`Shop on ${provider === "grabmart" ? "GrabMart" : "foodpanda"}`}
                      accessibilityHint="Copies remaining ingredients and opens the grocery store"
                    >
                      <P className="font-urbanist-semibold">
                        {provider === "grabmart" ? "GrabMart" : "foodpanda"}
                      </P>
                    </Button>
                  ))}
                </View>
                <P className="text-muted-foreground text-xs mt-2">
                  Copies remaining items so you can shop in the provider app or website.
                </P>
              </View>
            )}
            <GroceryListHeader />
          </>
        }
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

function GroceryListState({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerTitle: "Grocery List",
          unstable_headerRightItems: () => [],
        }}
      />
      {header}
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </View>
  );
}
