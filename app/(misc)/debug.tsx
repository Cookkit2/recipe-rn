import React, { useState, useEffect } from "react";
import { View, Alert, ScrollView } from "react-native";
import { H1, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { seedDatabase, addQuickSampleData, checkDatabase } from "~/data/db/seed";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { mealPlanApi } from "~/data/api/mealPlanApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeftIcon } from "lucide-uniwind";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";
import { log } from "~/utils/logger";
import type { DebugRecipe } from "./debug/types";
import type Recipe from "~/data/db/models/Recipe";
import { DebugStats } from "./debug/DebugStats";
import { DebugInspection } from "./debug/DebugInspection";
import { DebugQuickActions } from "./debug/DebugQuickActions";
import { DebugDataManagement } from "./debug/DebugDataManagement";
import { DebugExport } from "./debug/DebugExport";
import { DebugStorage } from "./debug/DebugStorage";

type Stats = Awaited<ReturnType<typeof databaseFacade.getDatabaseStats>> | null;
type MealPlanData = Awaited<ReturnType<typeof mealPlanApi.getAllMealPlanItems>>;
type Recommendations = Awaited<ReturnType<typeof databaseFacade.getAvailableRecipes>> | null;

export default function DebugScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useRefreshPantryItems();

  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Stats>(null);
  const [mealPlanData, setMealPlanData] = useState<MealPlanData>([]);

  // Database inspection states
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [stockItems, setStockItems] = useState<{ name: string; quantity: number; unit: string }[]>(
    []
  );
  const [recipes, setRecipes] = useState<DebugRecipe[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendations>(null);

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
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // --- Handlers ---

  const checkStats = async () => {
    try {
      const dbStats = await databaseFacade.getDatabaseStats();
      setStats(dbStats);
      log.info("Current stats:", dbStats);
    } catch (error) {
      log.error("Stats error:", error);
    }
  };

  const fetchMealPlanData = async () => {
    try {
      const items = await mealPlanApi.getAllMealPlanItems();
      setMealPlanData(items);
      log.info("Meal plan items:", items.length);
      return items;
    } catch (error) {
      log.error("Meal plan fetch error:", error);
      return [];
    }
  };

  const loadInspectionData = async () => {
    try {
      setInspectionLoading(true);

      const stock = await databaseFacade.getAllStock();
      setStockItems(stock.filter((s) => s.quantity > 0));

      const allRecipes = await databaseFacade.getAllRecipes();
      setRecipes(allRecipes);

      const topRecipes = allRecipes.slice(0, 3);
      const detailsMap = await databaseFacade.getRecipesWithDetails(
        topRecipes.map((r: Recipe) => r.id)
      );
      const recipesWithDetails = topRecipes.map((r) => {
        const debugRecipe = Object.assign(r, {
          details: detailsMap.get(r.id) || null,
        }) as DebugRecipe;
        return debugRecipe;
      });

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
      await Promise.all([refresh()]);
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

  const runHealthCheck = async () => {
    try {
      const isHealthy = await databaseFacade.isHealthy();
      const dbStats = await checkDatabase();
      Alert.alert(
        "Database Health",
        `Status: ${isHealthy ? "Healthy" : "Unhealthy"}\n\nRecipes: ${dbStats.recipes}\nStock Items: ${dbStats.stockItems}\nCooking History: ${dbStats.cookingHistory}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to check database health");
    }
  };

  const refreshAllContexts = async () => {
    try {
      setIsLoading(true);
      await Promise.all([refresh()]);
      Alert.alert("Success!", "UI contexts refreshed! Check your Pantry and Recipes.");
      await checkStats();
    } catch (error) {
      log.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh contexts");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMealPlan = () => {
    Alert.alert("Clear Meal Plan", "This will remove all planned recipes. Are you sure?", [
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
    ]);
  };

  const clearRecipes = () => {
    Alert.alert("Clear Recipes", "This will delete ALL recipes. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Recipes",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await databaseFacade.clearRecipes();
            await Promise.all([refresh()]);
            Alert.alert("Success!", "All recipes cleared");
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

  const clearAll = () => {
    Alert.alert("Clear Database", "This will delete ALL data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await databaseFacade.clearAllData();
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

  useEffect(() => {
    checkStats();
    fetchMealPlanData();
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
            accessibilityLabel="Go back"
          >
            <ArrowLeftIcon className="text-foreground" size={20} />
          </Button>
          <H1>Database Debug</H1>
        </View>

        <DebugStats
          stats={stats}
          mealPlanData={mealPlanData}
          isLoading={isLoading}
          onRefreshStats={checkStats}
          expanded={expandedSections.stats}
          onToggle={() => toggleSection("stats")}
        />

        <DebugInspection
          inspectionLoading={inspectionLoading}
          stockItems={stockItems}
          recipes={recipes}
          recommendations={recommendations}
          onLoadData={loadInspectionData}
          expanded={expandedSections.inspection}
          onToggle={() => toggleSection("inspection")}
        />

        <DebugQuickActions
          isLoading={isLoading}
          onSeedDatabase={runSeedDatabase}
          onAddSample={addSample}
          onHealthCheck={runHealthCheck}
          onRefreshAll={refreshAllContexts}
          expanded={expandedSections.quickActions}
          onToggle={() => toggleSection("quickActions")}
        />

        <DebugDataManagement
          isLoading={isLoading}
          onClearMealPlan={clearMealPlan}
          onClearRecipes={clearRecipes}
          onClearAll={clearAll}
          expanded={expandedSections.dataManagement}
          onToggle={() => toggleSection("dataManagement")}
        />

        <DebugExport
          isLoading={isLoading}
          onSetLoading={setIsLoading}
          onFetchMealPlanData={fetchMealPlanData}
          expanded={expandedSections.export}
          onToggle={() => toggleSection("export")}
        />

        <DebugStorage
          expanded={expandedSections.storage}
          onToggle={() => toggleSection("storage")}
        />

        {/* Instructions */}
        <View className="mt-4 p-4 bg-muted rounded-lg">
          <H3 className="mb-2">Instructions</H3>
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
