import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Keyboard, Pressable, TouchableOpacity, FlatList } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native";
import { useSearchRecipes } from "~/hooks/queries/useRecipeQueries";
import { useSearchPantryItems } from "~/hooks/queries/usePantryQueries";
import { IngredientResults } from "~/components/Search/IngredientResults";
import { RecipeResults } from "~/components/Search/RecipeResults";
import useColors from "~/hooks/useColor";

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
  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 10);
    return () => clearTimeout(t);
  }, [input]);
  const hasQuery = debouncedInput.trim().length > 0;

  const { data: recipeResults, isLoading: isLoadingRecipes } = useSearchRecipes(
    debouncedInput.trim()
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
    | { key: "loading" }
    | { key: "ingredients" }
    | { key: "recipes" }
    | { key: "no-results" }
    | { key: "suggestions" };

  const sections = useMemo<SectionItem[]>(() => {
    if (hasQuery) {
      const items: SectionItem[] = [];
      if (isLoadingRecipes || isLoadingIngredients) items.push({ key: "loading" });
      if (ingredientResults?.length) items.push({ key: "ingredients" });
      if (recipeResults?.length) items.push({ key: "recipes" });
      if (!isLoadingRecipes && !isLoadingIngredients && !hasResults)
        items.push({ key: "no-results" });
      return items;
    }
    const items: SectionItem[] = [];
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
              No results for "{debouncedInput.trim()}"
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
