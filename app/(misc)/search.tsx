import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Keyboard, Pressable, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { cn } from "~/lib/utils";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native";
import { useRecipes, type RecipeFilters } from "~/hooks/queries/useRecipeQueries";
import { usePantryItems } from "~/hooks/queries/usePantryQueries";
import { filterPantryItemsByName } from "~/utils/filterPantryItemsByName";
import { filterRecipesForSearch } from "~/utils/filterRecipesForSearch";
import { IngredientResults } from "~/components/Search/IngredientResults";
import { RecipeResults } from "~/components/Search/RecipeResults";
import useColors from "~/hooks/useColor";
import * as Haptics from "expo-haptics";

const TIME_OPTIONS = [
  { label: "15m", maxTotalTime: 15 },
  { label: "30m", maxTotalTime: 30 },
  { label: "60m", maxTotalTime: 60 },
  { label: "60m+", minTotalTime: 60 },
];

const DIFFICULTY_OPTIONS = [
  { label: "Easy", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Hard", value: 3 },
];

const DIETARY_TAGS = ["Vegetarian", "Vegan", "Gluten-Free"];

// const QUICK_ACTIONS = [
//   "What do I have?",
//   "What's expiring soon?",
//   "Suggest a meal",
//   "Find recipes",
// ];

export default function SearchScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const filterSheetRef = useRef<BottomSheet>(null);
  const filterSnapPoints = useMemo(() => ["55%"], []);

  const [input, setInput] = useState("");

  // Filters state
  const [selectedTime, setSelectedTime] = useState<{
    label: string;
    maxTotalTime?: number;
    minTotalTime?: number;
  } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const hasFilters =
    selectedTime !== null || selectedDifficulty !== null || selectedTags.length > 0;
  const trimmedInput = input.trim();
  const hasQuery = trimmedInput.length > 0 || hasFilters;
  const activeFilterCount =
    (selectedTime ? 1 : 0) + (selectedDifficulty ? 1 : 0) + selectedTags.length;

  const activeFilters = useMemo(() => {
    const filters: RecipeFilters = {};
    if (selectedTime?.maxTotalTime) filters.maxTotalTime = selectedTime.maxTotalTime;
    if (selectedTime?.minTotalTime) filters.minTotalTime = selectedTime.minTotalTime;
    if (selectedDifficulty) filters.difficulty = selectedDifficulty;
    if (selectedTags.length > 0) filters.tags = selectedTags;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [selectedTime, selectedDifficulty, selectedTags]);

  const { data: allRecipes = [], isPending: isRecipesCatalogPending } = useRecipes();
  const { data: pantryItems = [], isPending: isPantryPending } = usePantryItems();

  const recipeResults = useMemo(
    () => filterRecipesForSearch(allRecipes, trimmedInput, activeFilters),
    [allRecipes, trimmedInput, activeFilters]
  );

  const ingredientResults = useMemo(
    () => filterPantryItemsByName(pantryItems, trimmedInput),
    [pantryItems, trimmedInput]
  );

  const showSearchLoading =
    (hasQuery && isRecipesCatalogPending) || (trimmedInput.length > 0 && isPantryPending);

  useFocusEffect(
    useCallback(() => {
      // Try immediately and also after a delay to handle both first mount
      // and subsequent re-focus (screen already mounted in the stack).
      searchBarRef.current?.focus();
      const t = setTimeout(() => searchBarRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }, [])
  );

  // const handleQuickAction = (action: string) => {
  //   setInput(action);
  //   searchBarRef.current?.setText(action);
  //   searchBarRef.current?.focus();
  // };

  const handleDismiss = () => {
    Keyboard.dismiss();
    router.back();
  };

  const openFilterSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    filterSheetRef.current?.expand();
  };

  const closeFilterSheet = () => {
    filterSheetRef.current?.close();
  };

  const clearFilters = () => {
    setSelectedTime(null);
    setSelectedDifficulty(null);
    setSelectedTags([]);
  };

  const hasResults = (recipeResults && recipeResults.length > 0) || ingredientResults.length > 0;

  type SectionItem =
    | { key: "loading" }
    | { key: "ingredients" }
    | { key: "recipes" }
    | { key: "no-results" }
    | { key: "empty" }
    | { key: "suggestions" };

  const sections = useMemo<SectionItem[]>(() => {
    if (hasQuery) {
      const items: SectionItem[] = [];
      if (showSearchLoading) items.push({ key: "loading" });
      if (ingredientResults.length) items.push({ key: "ingredients" });
      if (recipeResults?.length) items.push({ key: "recipes" });
      if (!showSearchLoading && !hasResults) items.push({ key: "no-results" });
      return items;
    }
    return [{ key: "empty" }];
  }, [hasQuery, showSearchLoading, ingredientResults, recipeResults, hasResults]);

  const renderFilterChip = ({
    label,
    isActive,
    onPress,
  }: {
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      className={cn(
        "px-4 py-2 rounded-full border border-border",
        isActive ? "bg-primary border-primary" : "bg-card"
      )}
    >
      <Text
        className={cn(
          "text-sm font-urbanist-semibold",
          isActive ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFilterSheet = () => (
    <Portal name="search-filter-sheet">
      <BottomSheet
        ref={filterSheetRef}
        index={-1}
        snapPoints={filterSnapPoints}
        enablePanDownToClose
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 24 }}
        >
          <View className="flex-row items-start justify-between mb-6">
            <View>
              <Text className="text-2xl font-bowlby-one text-foreground">Filters</Text>
              <Text className="text-sm text-muted-foreground font-urbanist-medium mt-1">
                Narrow recipes by time, difficulty, or diet
              </Text>
            </View>

            {hasFilters ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear search filters"
                onPress={clearFilters}
                className="px-3 py-2 rounded-full bg-muted"
              >
                <Text className="text-sm font-urbanist-semibold text-foreground">Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="gap-6">
            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Cooking time
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <React.Fragment key={opt.label}>
                    {renderFilterChip({
                      label: opt.label,
                      isActive: selectedTime?.label === opt.label,
                      onPress: () =>
                        setSelectedTime(selectedTime?.label === opt.label ? null : opt),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Difficulty
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <React.Fragment key={opt.label}>
                    {renderFilterChip({
                      label: opt.label,
                      isActive: selectedDifficulty === opt.value,
                      onPress: () =>
                        setSelectedDifficulty(selectedDifficulty === opt.value ? null : opt.value),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Dietary
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => (
                  <React.Fragment key={tag}>
                    {renderFilterChip({
                      label: tag,
                      isActive: selectedTags.includes(tag),
                      onPress: () =>
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        ),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close search filters"
            onPress={closeFilterSheet}
            className="mt-8 rounded-2xl bg-foreground py-4 items-center"
          >
            <Text className="text-background font-urbanist-semibold text-base">Done</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </Portal>
  );

  const renderSection = ({ item }: { item: SectionItem }) => {
    switch (item.key) {
      case "loading":
        return (
          <View className="flex-row items-center gap-2 px-1 mt-12 mx-auto">
            <ActivityIndicator size="small" color="#999" />
            <Text className="text-xs text-muted-foreground font-urbanist-medium">Searching...</Text>
          </View>
        );
      case "ingredients":
        return <IngredientResults items={ingredientResults} colors={colors} />;
      case "recipes":
        return <RecipeResults recipes={recipeResults} />;
      case "no-results":
        return (
          <View className="items-center py-8 gap-2">
            <Text className="text-sm text-muted-foreground font-urbanist-medium">
              No results found
            </Text>
          </View>
        );
      case "empty":
        return (
          <View className="items-center px-6 pt-16">
            <Text className="text-sm text-muted-foreground font-urbanist-medium text-center">
              Search pantry items or recipes.
            </Text>
          </View>
        );
      // case "suggestions":
      //   return (
      //     <View className="mt-4 px-5">
      //       <Text className="text-xs text-muted-foreground font-urbanist-semibold mb-2.5 uppercase tracking-wider">
      //         Suggestions
      //       </Text>
      //       <View className="flex-row flex-wrap gap-2">
      //         {QUICK_ACTIONS.map((action, index) => (
      //           <TouchableOpacity
      //             key={index}
      //             onPress={() => handleQuickAction(action)}
      //             className="bg-card border border-border px-3.5 py-2 rounded-full"
      //           >
      //             <Text className="text-sm text-foreground font-urbanist-medium">{action}</Text>
      //           </TouchableOpacity>
      //         ))}
      //       </View>
      //     </View>
      //   );
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.SearchBar
        ref={searchBarRef}
        autoFocus
        onCancelButtonPress={handleDismiss}
        onClose={handleDismiss}
        onChangeText={(e) => setInput(e.nativeEvent.text)}
        placeholder="Search"
      />
      <Pressable className="flex-1" onPress={handleDismiss}>
        <FlatList
          className="flex-1 bg-background"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottom + 64, paddingTop: top + 10 }}
          data={sections}
          keyExtractor={(item) => item.key}
          renderItem={renderSection}
        />
      </Pressable>
      {/* <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasFilters ? `Open filters, ${activeFilterCount} active` : "Open filters"
        }
        onPress={openFilterSheet}
        className="absolute right-4 z-50 rounded-full border border-border bg-card p-2 shadow-sm"
        style={{ top: top + 8 }}
      >
        <SlidersHorizontalIcon
          className={hasFilters ? "text-primary" : "text-foreground"}
          size={22}
          strokeWidth={2.4}
        />
        {hasFilters ? (
          <View className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-primary items-center justify-center px-1">
            <Text className="text-[10px] leading-3 text-primary-foreground font-urbanist-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable> */}
      {renderFilterSheet()}
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
  },
});
