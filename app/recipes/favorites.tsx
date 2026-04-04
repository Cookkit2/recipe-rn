import React, { useState, useMemo } from "react";
import { View, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { LegendList } from "@legendapp/list";
import { useFavorites } from "~/hooks/queries/useFavorites";
import { H4, P } from "~/components/ui/typography";
import { HeartIcon, SearchIcon } from "lucide-uniwind";
import RecipeItemCard from "~/components/Pantry/RecipeItemCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FavoritesScreen() {
  const { data: favoriteRecipes, isLoading, error, refetch } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { top } = useSafeAreaInsets();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredRecipes = useMemo(() => {
    if (!favoriteRecipes) return [];
    if (!searchQuery.trim()) return favoriteRecipes;

    const query = searchQuery.toLowerCase().trim();
    return favoriteRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        (recipe.description && recipe.description.toLowerCase().includes(query))
    );
  }, [favoriteRecipes, searchQuery]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground font-urbanist-medium">Loading favorites...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-destructive font-urbanist-medium text-center">{error.message}</P>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: top + 10 }}>
      {/* Search Bar */}
      {favoriteRecipes && favoriteRecipes.length > 0 && (
        <View className="px-4 mb-4">
          <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-border shadow-sm shadow-black/5">
            <SearchIcon size={20} className="text-muted-foreground mr-3" />
            <TextInput
              className="flex-1 text-foreground font-urbanist-medium text-base h-8"
              placeholder="Search favorites..."
              placeholderTextColor="#A1A1AA"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </View>
      )}

      <LegendList
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        numColumns={2}
        className="px-3 bg-background"
        showsVerticalScrollIndicator={false}
        data={filteredRecipes}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1A1AA" />
        }
        renderItem={({ item }) => <RecipeItemCard key={item.id} recipe={item} />}
        ListEmptyComponent={
          <View className="py-16 items-center justify-center">
            <HeartIcon size={64} className="text-muted-foreground mb-4" />
            <H4 className="text-muted-foreground font-urbanist-semibold text-center">
              {searchQuery ? "No matching favorites" : "No favorite recipes yet"}
            </H4>
            <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1 px-6">
              {searchQuery
                ? "Try adjusting your search terms."
                : "Tap the heart icon on any recipe to save it here for later!"}
            </P>
          </View>
        }
      />
    </View>
  );
}
