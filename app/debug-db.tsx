import React, { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { H1, H3, P } from "~/components/ui/typography";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { SafeAreaView } from "react-native-safe-area-context";
import { log } from "~/utils/logger";

export default function DebugDBScreen() {
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load stock
      const stock = await databaseFacade.getAllStock();
      setStockItems(stock.filter((s) => s.quantity > 0));

      // Load recipes
      const allRecipes = await databaseFacade.getAllRecipes();
      setRecipes(allRecipes);

      // Get first 3 recipes with details
      const recipesWithDetails = await Promise.all(
        allRecipes.slice(0, 3).map(async (r) => {
          const details = await databaseFacade.getRecipeWithDetails(r.id);
          return { ...r, details };
        })
      );

      // Get recommendations
      const recs = await databaseFacade.getAvailableRecipes();
      setRecommendations(recs);

      setRecipes(recipesWithDetails);
    } catch (error) {
      log.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <P className="mt-4">Loading database info...</P>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <H1 className="mb-4">Database Debug</H1>

        {/* Stock Section */}
        <View className="mb-6">
          <H3 className="mb-2">📦 Stock Items ({stockItems.length})</H3>
          {stockItems.length === 0 ? (
            <P className="text-muted-foreground">
              No stock items with quantity
            </P>
          ) : (
            stockItems.map((item, i) => (
              <P key={i} className="ml-2">
                • {item.name}: {item.quantity} {item.unit}
              </P>
            ))
          )}
        </View>

        {/* Recipes Section */}
        <View className="mb-6">
          <H3 className="mb-2">📚 Recipes ({recipes.length} total)</H3>
          {recipes.length === 0 ? (
            <P className="text-muted-foreground">
              No recipes in local database!{"\n"}
              You may need to sync from Supabase.
            </P>
          ) : (
            recipes.map((recipe: any, i) => (
              <View key={i} className="ml-2 mb-3">
                <P className="font-semibold">{recipe.title}</P>
                {recipe.details?.ingredients && (
                  <View className="ml-4">
                    {recipe.details.ingredients.map((ing: any, j: number) => (
                      <P key={j} className="text-sm text-muted-foreground">
                        - {ing.name} ({ing.quantity} {ing.unit})
                      </P>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Recommendations Section */}
        <View className="mb-6">
          <H3 className="mb-2">🎯 Recommendations</H3>
          {recommendations ? (
            <>
              <P className="ml-2">
                ✅ Can make: {recommendations.canMake.length} recipes
              </P>
              {recommendations.canMake.slice(0, 5).map((r: any, i: number) => (
                <P key={i} className="ml-6 text-sm">
                  • {r.title}
                </P>
              ))}

              <P className="ml-2 mt-2">
                🔶 Partial: {recommendations.partiallyCanMake.length} recipes
              </P>
              {recommendations.partiallyCanMake
                .slice(0, 5)
                .map((item: any, i: number) => (
                  <P key={i} className="ml-6 text-sm">
                    • {item.recipe.title} ({item.completionPercentage}%)
                  </P>
                ))}
            </>
          ) : (
            <P className="text-muted-foreground">No recommendations loaded</P>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
