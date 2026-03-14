import React, { useState } from "react";
import { View, Alert, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { H1, H2, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { seedDatabase, addQuickSampleData, checkDatabase } from "~/data/db/seed";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-uniwind";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";
import { storage } from "~/data";
import { recipeApi } from "~/data/api/recipeApi";
import { mealPlanApi } from "~/data/api/mealPlanApi";
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
  const [mealPlanData, setMealPlanData] = useState<any[]>([]);

  // Database inspection states (from debug-db)
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);

  // Collapsible section states
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    inspection: false,
    quickActions: false,
    dataManagement: false,
    export: false,
    storage: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Database inspection (from debug-db)
  const loadInspectionData = async () => {
    try {
      setInspectionLoading(true);

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
      log.error("Error loading inspection data:", error);
    } finally {
      setInspectionLoading(false);
    }
  };

  const runSeedDatabase = async () => {
    try {
      setIsLoading(true);
      Alert.alert("Starting...", "Seeding database with dummy data...");

      await seedDatabase();

      // ✨ REFRESH ALL CONTEXTS AFTER SEEDING
      log.info("🔄 Refreshing all contexts after seeding...");
      await Promise.all([refresh()]);
      log.info("✅ Contexts refreshed successfully");

      Alert.alert("Success!", "Database seeded successfully! Check your Pantry and Recipes tabs.");
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

  const fetchMealPlanData = async () => {
    try {
      const items = await mealPlanApi.getAllMealPlanItems();
      setMealPlanData(items);
      log.info("📅 Meal plan items:", items.length);
      return items;
    } catch (error) {
      log.error("Meal plan fetch error:", error);
      return [];
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
        }\nStock Items: ${dbStats.stockItems}\nCooking History: ${dbStats.cookingHistory}`
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
      Alert.alert("Success!", "UI contexts refreshed! Check your Pantry and Recipes.");
      await checkStats();
    } catch (error) {
      log.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh contexts");
    } finally {
      setIsLoading(false);
    }
  };

  const clearRecipe = async () => {
    Alert.alert("Clear Recipes", "This will delete ALL recipes. Are you sure?", [
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

            Alert.alert("Success!", "All data cleared (recipes, stock, etc.)");
            await checkStats();
          } catch (error) {
            Alert.alert("Error", "Failed to clear data");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  React.useEffect(() => {
    checkStats();
    fetchMealPlanData();
  }, []);

  // Section Header Component
  const SectionHeader = ({
    title,
    section,
    icon,
  }: {
    title: string;
    section: keyof typeof expandedSections;
    icon: string;
  }) => (
    <Pressable
      onPress={() => toggleSection(section)}
      className="flex-row items-center justify-between bg-card p-4 rounded-lg mb-2"
    >
      <H3>
        {icon} {title}
      </H3>
      {expandedSections[section] ? (
        <ChevronUpIcon className="text-foreground" size={20} />
      ) : (
        <ChevronDownIcon className="text-foreground" size={20} />
      )}
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-background">
      <View style={{ paddingTop: top + 20 }} className="px-6 pb-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Button size="icon-sm" variant="ghost" onPress={() => router.back()} className="mr-3">
            <ArrowLeftIcon className="text-foreground" size={20} />
          </Button>
          <H1>Database Debug</H1>
        </View>

        {/* ==================== DATABASE STATS ==================== */}
        <SectionHeader title="Database Stats" section="stats" icon="📊" />
        {expandedSections.stats && (
          <View className="bg-card p-4 rounded-lg mb-4">
            {stats ? (
              <>
                <P>📊 Total Records: {stats.totalRecords}</P>
                <P>🍳 Recipes: {stats.recipes}</P>
                <P>🥕 Ingredients: {stats.ingredients}</P>
                <P>📦 Stock Items: {stats.stockItems}</P>
                <P>🏷️ Categories: {stats.categories}</P>
                <P>📅 Meal Plan Items: {mealPlanData.length}</P>

                {/* Meal Plan Display */}
                {mealPlanData.length > 0 && (
                  <View className="mt-4 pt-4 border-t border-border">
                    <H3 className="mb-3">📅 Current Meal Plan</H3>
                    {mealPlanData.map((item, index) => (
                      <View key={item.id} className="mb-2 p-2 bg-muted rounded">
                        <P className="font-medium">
                          {index + 1}. {item.recipe?.title ?? "Unknown Recipe"}
                        </P>
                        <P className="text-sm text-muted-foreground">
                          Servings: {item.servings} | Ingredients:{" "}
                          {item.recipe?.ingredients?.length ?? 0}
                        </P>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <P className="text-muted-foreground">Loading stats...</P>
            )}
            <Button
              onPress={checkStats}
              disabled={isLoading}
              variant="outline"
              className="w-full mt-3"
              size="sm"
            >
              <P className="text-foreground font-medium">🔄 Refresh Stats</P>
            </Button>
          </View>
        )}

        {/* ==================== DATABASE INSPECTION ==================== */}
        <SectionHeader title="Database Inspection" section="inspection" icon="🔍" />
        {expandedSections.inspection && (
          <View className="bg-card p-4 rounded-lg mb-4">
            {!inspectionLoading && stockItems.length === 0 && recipes.length === 0 ? (
              <Button onPress={loadInspectionData} variant="outline" className="w-full mb-3">
                <P className="text-foreground font-medium">Load Database Details</P>
              </Button>
            ) : inspectionLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" />
                <P className="mt-2 text-muted-foreground">Loading database details...</P>
              </View>
            ) : (
              <>
                {/* Stock Section */}
                <View className="mb-4">
                  <H3 className="mb-2">📦 Stock Items ({stockItems.length})</H3>
                  {stockItems.length === 0 ? (
                    <P className="text-muted-foreground ml-2">No stock items with quantity</P>
                  ) : (
                    stockItems.slice(0, 10).map((item, i) => (
                      <P key={i} className="ml-2 text-sm">
                        • {item.name}: {item.quantity} {item.unit}
                      </P>
                    ))
                  )}
                  {stockItems.length > 10 && (
                    <P className="text-xs text-muted-foreground ml-2 mt-1">
                      ...and {stockItems.length - 10} more
                    </P>
                  )}
                </View>

                {/* Recipes Section */}
                <View className="mb-4">
                  <H3 className="mb-2">📚 Recipes ({recipes.length} total)</H3>
                  {recipes.length === 0 ? (
                    <P className="text-muted-foreground ml-2">No recipes in local database</P>
                  ) : (
                    recipes.map((recipe: any, i) => (
                      <View key={i} className="ml-2 mb-2">
                        <P className="font-semibold text-sm">{recipe.title}</P>
                        {recipe.details?.ingredients && (
                          <P className="text-xs text-muted-foreground ml-2">
                            {recipe.details.ingredients.length} ingredients
                          </P>
                        )}
                      </View>
                    ))
                  )}
                </View>

                {/* Recommendations Section */}
                <View className="mb-4">
                  <H3 className="mb-2">🎯 Recommendations</H3>
                  {recommendations ? (
                    <>
                      <P className="ml-2">✅ Can make: {recommendations.canMake.length} recipes</P>
                      {recommendations.canMake.slice(0, 3).map((r: any, i: number) => (
                        <P key={i} className="ml-6 text-sm">
                          • {r.title}
                        </P>
                      ))}

                      <P className="ml-2 mt-2">
                        🔶 Partial: {recommendations.partiallyCanMake.length} recipes
                      </P>
                      {recommendations.partiallyCanMake.slice(0, 3).map((item: any, i: number) => (
                        <P key={i} className="ml-6 text-sm">
                          • {item.recipe.title} ({item.completionPercentage}%)
                        </P>
                      ))}
                    </>
                  ) : (
                    <P className="text-muted-foreground ml-2">No recommendations loaded</P>
                  )}
                </View>

                <Button onPress={loadInspectionData} variant="outline" className="w-full" size="sm">
                  <P className="text-foreground font-medium">🔄 Reload Inspection</P>
                </Button>
              </>
            )}
          </View>
        )}

        {/* ==================== QUICK ACTIONS ==================== */}
        <SectionHeader title="Quick Actions" section="quickActions" icon="⚡" />
        {expandedSections.quickActions && (
          <View className="bg-card p-4 rounded-lg mb-4 gap-2">
            <Button onPress={runSeedDatabase} disabled={isLoading} className="w-full">
              <P className="text-primary-foreground font-medium">
                🌱 {isLoading ? "Seeding..." : "Seed Full Database"}
              </P>
            </Button>

            <Button onPress={addSample} disabled={isLoading} variant="secondary" className="w-full">
              <P className="text-secondary-foreground font-medium">🎯 Add Sample Data</P>
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
          </View>
        )}

        {/* ==================== DATA MANAGEMENT ==================== */}
        <SectionHeader title="Data Management" section="dataManagement" icon="🗄️" />
        {expandedSections.dataManagement && (
          <View className="bg-card p-4 rounded-lg mb-4 gap-2">
            <Button
              onPress={async () => {
                Alert.alert(
                  "Clear Meal Plan",
                  "This will remove all planned recipes. Are you sure?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          setIsLoading(true);
                          await mealPlanApi.clearAllPlannedRecipes();
                          await fetchMealPlanData();
                          Alert.alert("Success!", "Meal plan cleared");
                        } catch (error) {
                          Alert.alert("Error", "Failed to clear meal plan");
                        } finally {
                          setIsLoading(false);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <P className="text-destructive-foreground font-medium">📅 Clear Meal Plan</P>
            </Button>

            <Button
              onPress={clearRecipe}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <P className="text-destructive-foreground font-medium">🧹 Clear Recipes</P>
            </Button>

            <Button
              onPress={clearAll}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <P className="text-destructive-foreground font-medium">🧹 Clear All Data</P>
            </Button>
          </View>
        )}

        {/* ==================== EXPORT & LOGGING ==================== */}
        <SectionHeader title="Export & Logging" section="export" icon="📤" />
        {expandedSections.export && (
          <View className="bg-card p-4 rounded-lg mb-4 gap-2">
            <Button
              onPress={() => {
                try {
                  const keys = storage.getAllKeys();
                  const data = keys.reduce<Record<string, unknown>>((acc, key) => {
                    acc[key] = storage.get(key);
                    return acc;
                  }, {});

                  const jsonOutput = JSON.stringify(data, null, 2);
                  log.info("Local Storage (All Keys):", jsonOutput);
                  Alert.alert(
                    "Storage Logged",
                    `${keys.length} storage items logged to console. Check your logs.`
                  );
                } catch (error) {
                  log.error("Failed to get storage values:", error);
                  Alert.alert("Error", "Failed to get storage values");
                }
              }}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <P className="text-foreground font-medium">🧾 Print Local Storage</P>
            </Button>

            <Button
              onPress={async () => {
                try {
                  const stock = await databaseFacade.getAllStock();
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
              <P className="text-foreground font-medium">📄 Print Ingredients JSON</P>
            </Button>

            <Button
              onPress={() => {
                try {
                  const appliances = storage.get<string | string[]>(PREF_APPLIANCES_KEY);
                  const diet = (storage.get(PREF_DIET_KEY) as string) ?? "none";
                  const allergens = storage.get<string | string[]>(PREF_ALLERGENS_KEY);
                  const otherAllergens = storage.get<string | string[]>(PREF_OTHER_ALLERGENS_KEY);

                  const preferences = {
                    electricAppliances: Array.isArray(appliances)
                      ? (appliances as string[])
                      : typeof appliances === "string"
                        ? (appliances as string).split(",")
                        : [],
                    dietaryPreference: diet,
                    allergens: Array.isArray(allergens)
                      ? (allergens as string[])
                      : typeof allergens === "string"
                        ? (allergens as string).split(",")
                        : [],
                    otherAllergens: Array.isArray(otherAllergens)
                      ? (otherAllergens as string[])
                      : typeof otherAllergens === "string"
                        ? (otherAllergens as string).split(",").map((a: string) => a.trim())
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
              <P className="text-foreground font-medium">⚙️ Print User Preferences</P>
            </Button>

            <Button
              onPress={async () => {
                try {
                  setIsLoading(true);
                  const { recipes } = await recipeApi.getRecipeRecommendations({
                    maxRecommendations: 10,
                  });

                  const output = recipes.map((r) => ({
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
                    instructions: (r.recipe.instructions || []).map((step) => ({
                      step: step.step,
                      title: step.title,
                      description: step.description,
                    })),
                  }));

                  const jsonOutput = JSON.stringify(output, null, 2);
                  log.info("Recommended Recipes (Full Data):", jsonOutput);
                  Alert.alert(
                    "Recipes Logged",
                    `${output.length} recommendations logged. Check your logs.`
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
              <P className="text-foreground font-medium">🍳 Print Recommended Recipes</P>
            </Button>

            <Button
              onPress={async () => {
                try {
                  const items = await fetchMealPlanData();
                  const jsonOutput = JSON.stringify(items, null, 2);
                  log.info("📅 Meal Plan Data:", jsonOutput);
                  Alert.alert(
                    "Meal Plan Logged",
                    `${items.length} meal plan items logged to console. Check your logs.`
                  );
                } catch (error) {
                  log.error("Failed to get meal plan:", error);
                  Alert.alert("Error", "Failed to get meal plan data");
                }
              }}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <P className="text-foreground font-medium">📅 Print Meal Plan JSON</P>
            </Button>
          </View>
        )}

        {/* ==================== STORAGE RESET ==================== */}
        <SectionHeader title="Storage Reset" section="storage" icon="🔑" />
        {expandedSections.storage && (
          <View className="bg-card p-4 rounded-lg mb-4 gap-2">
            <Button onPress={() => storage.delete(ONBOARDING_COMPLETED_KEY)} variant="outline">
              <P className="text-foreground">Clear Onboarding Key</P>
            </Button>
            <Button onPress={() => storage.delete(PREFERENCE_COMPLETED_KEY)} variant="outline">
              <P className="text-foreground">Clear Preference Key</P>
            </Button>
            <Button onPress={() => storage.delete(RECIPE_COOKED_KEY)} variant="outline">
              <P className="text-foreground">Clear Recipe Cooked Key</P>
            </Button>
          </View>
        )}

        {/* Instructions */}
        <View className="mt-4 p-4 bg-muted rounded-lg">
          <H3 className="mb-2">💡 Instructions</H3>
          <P className="text-sm text-muted-foreground">
            • Quick Actions: Seed database, add samples, check health
          </P>
          <P className="text-sm text-muted-foreground">
            • Data Management: Clear specific data sets
          </P>
          <P className="text-sm text-muted-foreground">
            • Export & Logging: Print data to console for debugging
          </P>
          <P className="text-sm text-muted-foreground">• Storage Reset: Clear app state flags</P>
        </View>
      </View>
    </ScrollView>
  );
}
