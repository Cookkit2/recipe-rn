import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { BookOpenIcon, HistoryIcon } from "lucide-uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RecyclingList from "~/components/Shared/RecyclingList";
import ScrollAwarePressable from "~/components/Shared/ScrollAwarePressable";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { H4, P } from "~/components/ui/typography";
import { useMyRecipes } from "~/hooks/queries/useMyRecipes";
import useColors from "~/hooks/useColor";
import type { Recipe } from "~/types/Recipe";
import { filterRecipesForSearch } from "~/utils/filterRecipesForSearch";

function MyRecipeRow({ recipe }: { recipe: Recipe }) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <Link href={`/recipes/${recipe.id}`} asChild>
      <ScrollAwarePressable
        accessibilityRole="button"
        accessibilityLabel={recipe.title}
        className="mx-6 py-3 flex-row items-center gap-4 border-b border-border"
      >
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            recyclingKey={recipe.id}
            accessibilityLabel={`Image of ${recipe.title}`}
          />
        ) : (
          <View style={styles.image} className="bg-muted items-center justify-center">
            <BookOpenIcon size={28} className="text-muted-foreground" />
          </View>
        )}
        <View className="flex-1 gap-1">
          <H4 className="text-foreground font-urbanist-semibold" numberOfLines={2}>
            {recipe.title}
          </H4>
          {minutes > 0 && <P className="text-muted-foreground text-sm">{minutes} min</P>}
        </View>
      </ScrollAwarePressable>
    </Link>
  );
}

const renderRecipe = ({ item }: { item: Recipe }) => <MyRecipeRow recipe={item} />;

export default function MyRecipesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { data: recipes = [], isPending, error, refetch } = useMyRecipes();
  const [search, setSearch] = useState("");
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
          {recipes.length > 0 && (
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
            estimatedItemSize={105}
            className="bg-background"
            contentPadding={{ bottom: bottom + 24 }}
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

const styles = StyleSheet.create({
  image: { width: 80, height: 80, borderRadius: 16 },
});
