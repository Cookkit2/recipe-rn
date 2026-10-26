import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { HistoryIcon } from "lucide-uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RecyclingList from "~/components/Shared/RecyclingList";
import RecipeItemCard from "~/components/Pantry/RecipeItemCard";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { H4, P } from "~/components/ui/typography";
import { useMyRecipes } from "~/hooks/queries/useMyRecipes";
import useColors from "~/hooks/useColor";
import type { Recipe } from "~/types/Recipe";
import { filterRecipesForSearch } from "~/utils/filterRecipesForSearch";
import type { SearchBarCommands } from "react-native-screens";

const renderRecipe = ({ item }: { item: Recipe }) => (
  <RecipeItemCard recipe={item} titleClassName="text-foreground" />
);

export default function MyRecipesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { data: recipes = [], isPending, error, refetch } = useMyRecipes();
  const [search, setSearch] = useState("");
  const searchBar = useRef<SearchBarCommands>(null);
  const filteredRecipes = useMemo(() => filterRecipesForSearch(recipes, search), [recipes, search]);
  const openHistory = useCallback(() => router.push("/profile/cooked-recipes"), [router]);

  // Returning from an import, edit or favorite change refreshes quietly.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch])
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTitle: "My Recipes",
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          ...(Platform.OS !== "ios"
            ? {
                headerRight: () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cooking history"
                    onPress={openHistory}
                    hitSlop={8}
                    className="p-2"
                  >
                    <HistoryIcon size={24} className="text-foreground" />
                  </Pressable>
                ),
              }
            : {}),
        }}
      />
      {Platform.OS !== "web" && (
        <Stack.SearchBar
          ref={searchBar}
          placeholder="Search my recipes"
          placement="stacked"
          hideWhenScrolling={false}
          hideNavigationBar={false}
          obscureBackground={false}
          autoCapitalize="none"
          textColor={colors.foreground}
          tintColor={colors.foreground}
          headerIconColor={colors.foreground}
          hintTextColor={colors.mutedForeground}
          onChangeText={({ nativeEvent }) => setSearch(nativeEvent.text)}
          onCancelButtonPress={() => setSearch("")}
          onClose={() => setSearch("")}
          onSearchButtonPress={() => searchBar.current?.blur()}
        />
      )}
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="clock.arrow.circlepath"
            tintColor={colors.foreground}
            accessibilityLabel="Cooking history"
            onPress={openHistory}
          />
        </Stack.Toolbar>
      )}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator accessibilityLabel="Loading my recipes" color={colors.foreground} />
        </View>
      ) : error && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <P className="text-muted-foreground text-center">Couldn't load your recipes</P>
          <Button variant="ghost" onPress={() => void refetch()}>
            <P className="text-foreground">Try again</P>
          </Button>
        </View>
      ) : (
        <>
          {Platform.OS === "web" && recipes.length > 0 && (
            <View className="px-6 pt-3 pb-2">
              <Input
                accessibilityLabel="Search my recipes"
                placeholder="Search my recipes"
                placeholderTextColor={colors.mutedForeground}
                className="text-left text-foreground"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          )}
          <RecyclingList
            testID="my-recipes-list"
            data={filteredRecipes}
            keyExtractor={(recipe) => recipe.id}
            renderItem={renderRecipe}
            numColumns={2}
            estimatedItemSize={270}
            className="bg-background"
            contentPadding={{ left: 12, right: 12, top: 8, bottom: bottom + 16 }}
            empty={
              <View className="px-6 py-20 items-center">
                <H4 className="text-muted-foreground text-center font-urbanist-semibold">
                  {search.trim() ? "No matching recipes" : "No recipes saved yet"}
                </H4>
                <P className="text-muted-foreground text-center text-sm mt-1">
                  {search.trim() ? "Try another name" : "Recipes you import or save appear here"}
                </P>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}
