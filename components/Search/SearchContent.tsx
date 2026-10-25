import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Keyboard, Pressable, TouchableOpacity, StyleSheet, BackHandler } from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  type BottomSheetMethods,
} from "@expo/ui/community/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { cn } from "~/lib/utils";
import { Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native";
import { useRecipes, type RecipeFilters } from "~/hooks/queries/useRecipeQueries";
import { usePantryItems } from "~/hooks/queries/usePantryQueries";
import { filterPantryItemsByName } from "~/utils/filterPantryItemsByName";
import { filterRecipesForSearch } from "~/utils/filterRecipesForSearch";
import { SearchResultsList } from "~/components/Search/SearchResultsList";
import useColors from "~/hooks/useColor";
import * as Haptics from "expo-haptics";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import { useSearchBarFocus } from "~/hooks/useSearchBarFocus";

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

export function SearchContent({
  onDismiss,
  focusEnabled = true,
  transparent = false,
}: {
  onDismiss: () => void;
  focusEnabled?: boolean;
  transparent?: boolean;
}) {
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();
  const { searchBarRef, onFocus, onBlur } = useSearchBarFocus(focusEnabled);
  const filterSheetRef = useRef<BottomSheetMethods>(null);
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
  const [minRating, setMinRating] = useState<number | null>(null);

  const hasFilters =
    selectedTime !== null ||
    selectedDifficulty !== null ||
    selectedTags.length > 0 ||
    minRating !== null;
  const trimmedInput = input.trim();
  const hasQuery = trimmedInput.length > 0 || hasFilters;
  const activeFilterCount =
    (selectedTime ? 1 : 0) +
    (selectedDifficulty ? 1 : 0) +
    selectedTags.length +
    (minRating ? 1 : 0);

  const activeFilters = useMemo(() => {
    const filters: RecipeFilters = {};
    if (selectedTime?.maxTotalTime) filters.maxTotalTime = selectedTime.maxTotalTime;
    if (selectedTime?.minTotalTime) filters.minTotalTime = selectedTime.minTotalTime;
    if (selectedDifficulty) filters.difficulty = selectedDifficulty;
    if (selectedTags.length > 0) filters.tags = selectedTags;
    if (minRating) filters.minRating = minRating;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [selectedTime, selectedDifficulty, selectedTags, minRating]);

  const { data: allRecipes = [], isPending: isRecipesCatalogPending } = useRecipes();
  const { data: pantryItems = [], isPending: isPantryPending } = usePantryItems();
  const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");

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

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  useFocusEffect(
    useCallback(() => {
      if (!focusEnabled) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        handleDismiss();
        return true;
      });
      return () => subscription.remove();
    }, [focusEnabled, handleDismiss])
  );

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
    setMinRating(null);
  };

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

            {reviewsEnabled && (
              <View className="gap-3">
                <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                  Rating
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {renderFilterChip({
                    label: "4+ Stars",
                    isActive: minRating === 4,
                    onPress: () => setMinRating(minRating === 4 ? null : 4),
                  })}
                </View>
              </View>
            )}
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

  return (
    <View className={transparent ? "flex-1" : "flex-1 bg-background"}>
      {focusEnabled && (
        <Stack.SearchBar
          ref={searchBarRef}
          onFocus={onFocus}
          onBlur={onBlur}
          hideNavigationBar
          onCancelButtonPress={handleDismiss}
          onClose={handleDismiss}
          onChangeText={(e) => setInput(e.nativeEvent.text)}
          placeholder="Search"
        />
      )}
      <Pressable className="flex-1" onPress={handleDismiss}>
        <SearchResultsList
          recipes={recipeResults}
          ingredients={ingredientResults}
          colors={colors}
          hasQuery={hasQuery}
          loading={showSearchLoading}
          top={top}
          bottom={bottom}
          transparent={transparent}
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
    </View>
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
