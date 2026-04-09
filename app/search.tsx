import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Keyboard, Pressable, TouchableOpacity, FlatList, ScrollView } from "react-native";
import { cn } from "~/lib/utils";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native";
import { useSearchRecipes } from "~/hooks/queries/useRecipeQueries";
import { useSearchPantryItems } from "~/hooks/queries/usePantryQueries";
import { IngredientResults } from "~/components/Search/IngredientResults";
import { RecipeResults } from "~/components/Search/RecipeResults";
import useColors from "~/hooks/useColor";

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

const QUICK_ACTIONS = [
  "What do I have?",
  "What's expiring soon?",
  "Suggest a meal",
  "Find recipes",
];

export default function SearchScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const searchBarRef = useRef<SearchBarCommands>(null);

  const [input, setInput] = useState("");

  const [debouncedInput, setDebouncedInput] = useState("");

  // Filters state
  const [selectedTime, setSelectedTime] = useState<{
    label: string;
    maxTotalTime?: number;
    minTotalTime?: number;
  } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 250);
    return () => clearTimeout(t);
  }, [input]);
  const hasFilters =
    selectedTime !== null || selectedDifficulty !== null || selectedTags.length > 0;
  const hasQuery = debouncedInput.trim().length > 0 || hasFilters;

  const activeFilters = useMemo(() => {
    const filters: any = {};
    if (selectedTime?.maxTotalTime) filters.maxTotalTime = selectedTime.maxTotalTime;
    if (selectedTime?.minTotalTime) filters.minTotalTime = selectedTime.minTotalTime;
    if (selectedDifficulty) filters.difficulty = selectedDifficulty;
    if (selectedTags.length > 0) filters.tags = selectedTags;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [selectedTime, selectedDifficulty, selectedTags]);

  const { data: recipeResults, isLoading: isLoadingRecipes } = useSearchRecipes(
    debouncedInput.trim(),
    activeFilters
  );
  const { data: ingredientResults, isLoading: isLoadingIngredients } = useSearchPantryItems(
    debouncedInput.trim()
  );

  useFocusEffect(
    useCallback(() => {
      // Try immediately and also after a delay to handle both first mount
      // and subsequent re-focus (screen already mounted in the stack).
      searchBarRef.current?.focus();
      const t = setTimeout(() => searchBarRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }, [])
  );

  const handleQuickAction = (action: string) => {
    setInput(action);
    searchBarRef.current?.setText(action);
    searchBarRef.current?.focus();
  };

  // const handleSearch = async () => {
  //   if (!input.trim()) return;
  //   await sendMessage(input);
  //   Keyboard.dismiss();
  // };

  const handleDismiss = () => {
    Keyboard.dismiss();
    router.back();
  };

  const hasResults =
    (recipeResults && recipeResults.length > 0) ||
    (ingredientResults && ingredientResults.length > 0);

  type SectionItem =
    | { key: "filters" }
    | { key: "loading" }
    | { key: "ingredients" }
    | { key: "recipes" }
    | { key: "no-results" }
    | { key: "suggestions" };

  const sections = useMemo<SectionItem[]>(() => {
    if (hasQuery) {
      const items: SectionItem[] = [{ key: "filters" }];
      if (isLoadingRecipes || isLoadingIngredients) items.push({ key: "loading" });
      if (ingredientResults?.length) items.push({ key: "ingredients" });
      if (recipeResults?.length) items.push({ key: "recipes" });
      if (!isLoadingRecipes && !isLoadingIngredients && !hasResults)
        items.push({ key: "no-results" });
      return items;
    }
    const items: SectionItem[] = [{ key: "filters" }];
    return items;
  }, [
    hasQuery,
    isLoadingRecipes,
    isLoadingIngredients,
    ingredientResults,
    recipeResults,
    hasResults,
  ]);

  const renderSection = ({ item }: { item: SectionItem }) => {
    switch (item.key) {
      case "filters":
        return (
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-4"
              contentContainerStyle={{ gap: 8, paddingRight: 32 }}
            >
              {TIME_OPTIONS.map((opt) => {
                const isActive = selectedTime?.label === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setSelectedTime(isActive ? null : opt)}
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
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View className="w-[1px] h-6 bg-border mx-1 self-center" />

              {DIFFICULTY_OPTIONS.map((opt) => {
                const isActive = selectedDifficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setSelectedDifficulty(isActive ? null : opt.value)}
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
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View className="w-[1px] h-6 bg-border mx-1 self-center" />

              {DIETARY_TAGS.map((tag) => {
                const isActive = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() =>
                      setSelectedTags((prev) =>
                        isActive ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
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
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

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
    </>
  );
}
