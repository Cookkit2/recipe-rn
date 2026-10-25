import type { ReactNode } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { H3, H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { CheckCircleIcon } from "lucide-uniwind";
import { useGroceryList } from "~/hooks/queries/useGroceryList";
import { useGroceryListActions } from "~/hooks/useGroceryListActions";
import GroceryListItem from "~/components/GroceryList/GroceryListItem";
import GroceryListHeader from "~/components/GroceryList/GroceryListHeader";
import { Stack, Link } from "expo-router";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { WeekNavigationHeader } from "~/app/meal-plan/components/WeekNavigationHeader";
import GroceryListHeaderRight from "~/components/GroceryList/GroceryListHeaderRight";
import useColors from "~/hooks/useColor";

export default function GroceryListPage() {
  const colors = useColors();
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
  const allItems = sections.flatMap((section) => section.items);

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
    />
  );
  const canSelectItems =
    !isLoading && !error && !isEmpty && hasNeededItems && !stats.allCheckedOrCovered;
  const toolbar = (
    <GroceryListHeaderRight
      items={allItems}
      canSelectItems={canSelectItems}
      isSelectionMode={canSelectItems && isSelectionMode}
      onToggleSelection={toggleSelectionMode}
      onDeleteSelected={handleDeleteSelected}
    />
  );
  if (error)
    return (
      <GroceryListState header={weekNavigation} toolbar={toolbar}>
        <P>Couldn't load the shopping list.</P>
        <Button variant="outline" onPress={() => refetch()}>
          <P>Try again</P>
        </Button>
      </GroceryListState>
    );

  // Loading state
  if (isLoading) {
    return (
      <GroceryListState header={weekNavigation} toolbar={toolbar}>
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading grocery list...</P>
      </GroceryListState>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <GroceryListState header={weekNavigation} toolbar={toolbar}>
        <H4 className="text-muted-foreground text-center font-urbanist-semibold">
          Your grocery list is empty
        </H4>
        <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
          Add recipes to your meal plan
        </P>
        <Link href="/meal-plan" asChild>
          <Button variant="outline" className="mt-5">
            <P className="font-urbanist-semibold text-sm text-muted-foreground">Plan meals</P>
          </Button>
        </Link>
      </GroceryListState>
    );
  }

  // All items covered/checked state
  if (!hasNeededItems || stats.allCheckedOrCovered) {
    return (
      <GroceryListState header={weekNavigation} toolbar={toolbar}>
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
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          headerTitle: isSelectionMode ? `${selectedItemNames.size} Selected` : "Grocery List",
        }}
      />
      {toolbar}
      {weekNavigation}
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
    </View>
  );
}

function GroceryListState({
  header,
  toolbar,
  children,
}: {
  header: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  const colors = useColors();

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          headerTitle: "Grocery List",
        }}
      />
      {toolbar}
      {header}
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </View>
  );
}
