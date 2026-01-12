import React, { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { H1, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import {
  seedDatabase,
  addQuickSampleData,
  checkDatabase,
} from "~/data/db/seed";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeftIcon } from "lucide-nativewind";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";
import { storage } from "~/data";
import { recipeApi } from "~/data/api/recipeApi";
import {
  ONBOARDING_COMPLETED_KEY,
  PREFERENCE_COMPLETED_KEY,
  RECIPE_COOKED_KEY,
  PREF_APPLIANCES_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
  PREF_DIET_KEY,
} from "~/constants/storage-keys";
import { log } from "~/utils/logger";

export default function DebugScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Get context refresh functions
  const { refresh } = useRefreshPantryItems();
  // const { refreshRecipes } = useRecipeStore();

  const runSeedDatabase = async () => {
    try {
      setIsLoading(true);
      Alert.alert("Starting...", "Seeding database with dummy data...");

      await seedDatabase();

      // ✨ REFRESH ALL CONTEXTS AFTER SEEDING
      log.info("🔄 Refreshing all contexts after seeding...");
      await Promise.all([refresh()]);
      log.info("✅ Contexts refreshed successfully");

      Alert.alert(
        "Success!",
        "Database seeded successfully! Check your Pantry and Recipes tabs."
      );
      await checkStats();
    } catch (error) {
      log.error("Seeding error:", error);
      Alert.alert("Error", "Failed to seed database");
    } finally {
      setIsLoading(false);
    }
  };

  const addSample = async () => {
    try {
      setIsLoading(true);
      await addQuickSampleData();

      // Refresh contexts after adding sample data
      await Promise.all([refresh()]);

      Alert.alert("Success!", "Sample data added");
      await checkStats();
    } catch (error) {
      log.error("Sample data error:", error);
      Alert.alert("Error", "Failed to add sample data");
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = async () => {
    Alert.alert("Clear Database", "This will delete ALL data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await databaseFacade.clearAllData();

            // Refresh contexts after clearing data
            await Promise.all([refresh()]);

            Alert.alert("Success!", "Database cleared");
            await checkStats();
          } catch (error) {
            Alert.alert("Error", "Failed to clear database");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const checkStats = async () => {
    try {
      const dbStats = await databaseFacade.getDatabaseStats();
      setStats(dbStats);
      log.info("📊 Current stats:", dbStats);
    } catch (error) {
      log.error("Stats error:", error);
    }
  };

  const runHealthCheck = async () => {
    try {
      const isHealthy = await databaseFacade.isHealthy();
      const dbStats = await checkDatabase();
      Alert.alert(
        "Database Health",
        `Status: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}\n\nRecipes: ${
          dbStats.recipes
        }\nStock Items: ${dbStats.stockItems}\nCooking History: ${
          dbStats.cookingHistory
        }`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to check database health");
    }
  };

  const refreshAllContexts = async () => {
    try {
      setIsLoading(true);
      log.info("🔄 Manually refreshing all contexts...");

      await Promise.all([refresh()]);

      log.info("✅ All contexts refreshed successfully");
      Alert.alert(
        "Success!",
        "UI contexts refreshed! Check your Pantry and Recipes."
      );
      await checkStats();
    } catch (error) {
      log.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh contexts");
    } finally {
      setIsLoading(false);
    }
  };

  const clearRecipe = async () => {
    Alert.alert(
      "Clear Recipes",
      "This will delete ALL recipes. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Recipes",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              // Note: clearAllData clears everything.
              // TODO: Add clearRecipes() method to DatabaseFacade if needed
              await databaseFacade.clearAllData();

              // Refresh contexts after clearing data
              await Promise.all([refresh()]);

              Alert.alert(
                "Success!",
                "All data cleared (recipes, stock, etc.)"
              );
              await checkStats();
            } catch (error) {
              Alert.alert("Error", "Failed to clear data");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  React.useEffect(() => {
    checkStats();
  }, []);

  return (
    <ScrollView className="flex-1 bg-background">
      <View style={{ paddingTop: top + 20 }} className="px-6 pb-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Button
            size="icon-sm"
            variant="ghost"
            onPress={() => router.back()}
            className="mr-3"
          >
            <ArrowLeftIcon className="text-foreground" size={20} />
          </Button>
          <H1>Database Debug</H1>
        </View>

        {/* Stats Display */}
        {stats && (
          <View className="bg-card p-4 rounded-lg mb-6">
            <H3 className="mb-3">Current Database Stats</H3>
            <P>📊 Total Records: {stats.totalRecords}</P>
            <P>🍳 Recipes: {stats.recipes}</P>
            <P>🥕 Ingredients: {stats.ingredients}</P>
            <P>📦 Stock Items: {stats.stockItems}</P>
            <P>🏷️ Categories: {stats.categories}</P>
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-1">
          <Button
            onPress={runSeedDatabase}
            disabled={isLoading}
            className="w-full"
          >
            <P className="text-primary-foreground font-medium">
              🌱 {isLoading ? "Seeding..." : "Seed Full Database"}
            </P>
          </Button>

          <Button
            onPress={addSample}
            disabled={isLoading}
            variant="secondary"
            className="w-full"
          >
            <P className="text-secondary-foreground font-medium">
              🎯 Add Sample Data
            </P>
          </Button>

          <Button
            onPress={runHealthCheck}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">🔍 Health Check</P>
          </Button>

          <Button
            onPress={refreshAllContexts}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">🔄 Refresh UI Data</P>
          </Button>

          <Button
            onPress={checkStats}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">📊 Refresh Stats</P>
          </Button>

          <Button
            onPress={async () => {
              try {
                const stock = await databaseFacade.getAllStock();
                // Extract plain data from WatermelonDB models to avoid circular references
                const plainData = stock.map((item) => ({
                  id: item.id,
                  name: item.name,
                  quantity: item.quantity,
                  unit: item.unit,
                  expiryDate: item.expiryDate,
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                }));
                const jsonOutput = JSON.stringify(plainData, null, 2);
                log.info("Current Ingredients (Stock):", jsonOutput);
                Alert.alert(
                  "Ingredients Logged",
                  `${stock.length} ingredients logged to console. Check your logs.`
                );
              } catch (error) {
                log.error("Failed to get ingredients:", error);
                Alert.alert("Error", "Failed to get ingredients");
              }
            }}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">
              📄 Print Ingredients JSON
            </P>
          </Button>

          <Button
            onPress={() => {
              try {
                // Get user preferences from storage
                const appliances = storage.get(PREF_APPLIANCES_KEY) || "";
                const diet = storage.get(PREF_DIET_KEY) || "none";
                const allergens = storage.get(PREF_ALLERGENS_KEY) || "";
                const otherAllergens =
                  storage.get(PREF_OTHER_ALLERGENS_KEY) || "";

                const preferences = {
                  electricAppliances: appliances ? appliances?.split(",") : [],
                  dietaryPreference: diet,
                  allergens: allergens ? allergens?.split(",") : [],
                  otherAllergens: otherAllergens
                    ? otherAllergens?.split(",").map((a: string) => a.trim())
                    : [],
                };

                const jsonOutput = JSON.stringify(preferences, null, 2);
                log.info("User Preferences:", jsonOutput);
                Alert.alert(
                  "Preferences Logged",
                  "User preferences logged to console. Check your logs."
                );
              } catch (error) {
                log.error("Failed to get preferences:", error);
                Alert.alert("Error", "Failed to get preferences");
              }
            }}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">
              ⚙️ Print User Preferences
            </P>
          </Button>

          <Button
            onPress={async () => {
              try {
                setIsLoading(true);
                const recommendations =
                  await recipeApi.getRecipeRecommendations({
                    maxRecommendations: 10,
                    respectDietaryPreferences: true,
                  });

                const output = {
                  canMake: recommendations.canMakeRecommendations.map((r) => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    prepMinutes: r.prepMinutes,
                    cookMinutes: r.cookMinutes,
                    servings: r.servings,
                    difficultyStars: r.difficultyStars,
                    calories: r.calories,
                    tags: r.tags,
                    ingredients: (r.ingredients || []).map((ing) => ({
                      name: ing.name,
                      quantity: ing.quantity,
                      unit: ing.unit,
                      notes: ing.notes,
                    })),
                    instructions: (r.instructions || []).map((step) => ({
                      step: step.step,
                      title: step.title,
                      description: step.description,
                    })),
                  })),
                  partiallyCanMake: recommendations.partialRecommendations.map(
                    (r) => ({
                      id: r.recipe.id,
                      title: r.recipe.title,
                      description: r.recipe.description,
                      completionPercentage: r.completionPercentage,
                      prepMinutes: r.recipe.prepMinutes,
                      cookMinutes: r.recipe.cookMinutes,
                      servings: r.recipe.servings,
                      difficultyStars: r.recipe.difficultyStars,
                      calories: r.recipe.calories,
                      tags: r.recipe.tags,
                      ingredients: (r.recipe.ingredients || []).map((ing) => ({
                        name: ing.name,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        notes: ing.notes,
                      })),
                      instructions: (r.recipe.instructions || []).map(
                        (step) => ({
                          step: step.step,
                          title: step.title,
                          description: step.description,
                        })
                      ),
                    })
                  ),
                };

                const jsonOutput = JSON.stringify(output, null, 2);
                log.info("Recommended Recipes (Full Data):", jsonOutput);
                Alert.alert(
                  "Recipes Logged",
                  `${output.canMake.length} complete + ${output.partiallyCanMake.length} partial recommendations logged. Check your logs.`
                );
              } catch (error) {
                log.error("Failed to get recommendations:", error);
                Alert.alert("Error", "Failed to get recommendations");
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">
              🍳 Print Recommended Recipes
            </P>
          </Button>

          <Button
            onPress={clearRecipe}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">
              🧹 Clear Recipe
            </P>
          </Button>

          <Button
            onPress={clearAll}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">
              🧹 Clear All Data
            </P>
          </Button>

          <Button
            onPress={() => {
              storage.delete(ONBOARDING_COMPLETED_KEY);
            }}
          >
            <P>Clear onboarding key</P>
          </Button>
          <Button
            onPress={() => {
              storage.delete(PREFERENCE_COMPLETED_KEY);
            }}
          >
            <P>Clear preference key</P>
          </Button>
          <Button
            onPress={() => {
              storage.delete(RECIPE_COOKED_KEY);
            }}
          >
            <P>Clear recipe cooked key</P>
          </Button>
        </View>

        {/* Instructions */}
        <View className="mt-8 p-4 bg-muted rounded-lg">
          <H3 className="mb-2">Instructions</H3>
          <P className="text-sm text-muted-foreground">
            • Seed Full Database: Populates with all dummy recipes and pantry
            items
          </P>
          <P className="text-sm text-muted-foreground">
            • Add Sample Data: Adds just a few test items quickly
          </P>
          <P className="text-sm text-muted-foreground">
            • Health Check: Verifies database is working properly
          </P>
          <P className="text-sm text-muted-foreground">
            • Refresh UI Data: Updates Pantry and Recipe displays with current
            database data
          </P>
          <P className="text-sm text-muted-foreground">
            • Clear All Data: Removes everything (use for testing)
          </P>
        </View>
      </View>
    </ScrollView>
  );
}
