import React, { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { H1, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { seedDatabase, addSampleData, checkDatabase } from "~/data/db/seed";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeftIcon } from "lucide-nativewind";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";

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
      console.log("🔄 Refreshing all contexts after seeding...");
      await Promise.all([refresh()]);
      console.log("✅ Contexts refreshed successfully");

      Alert.alert(
        "Success!",
        "Database seeded successfully! Check your Pantry and Recipes tabs."
      );
      await checkStats();
    } catch (error) {
      console.error("Seeding error:", error);
      Alert.alert("Error", "Failed to seed database");
    } finally {
      setIsLoading(false);
    }
  };

  const addSample = async () => {
    try {
      setIsLoading(true);
      await addSampleData();

      // Refresh contexts after adding sample data
      await Promise.all([refresh()]);

      Alert.alert("Success!", "Sample data added");
      await checkStats();
    } catch (error) {
      console.error("Sample data error:", error);
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
      console.log("📊 Current stats:", dbStats);
    } catch (error) {
      console.error("Stats error:", error);
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
        }\nIngredients: ${dbStats.ingredients}\nStock Items: ${
          dbStats.stockItems
        }`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to check database health");
    }
  };

  const refreshAllContexts = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Manually refreshing all contexts...");

      await Promise.all([refresh()]);

      console.log("✅ All contexts refreshed successfully");
      Alert.alert(
        "Success!",
        "UI contexts refreshed! Check your Pantry and Recipes."
      );
      await checkStats();
    } catch (error) {
      console.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh contexts");
    } finally {
      setIsLoading(false);
    }
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
        <View className="space-y-4">
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
            onPress={clearAll}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">
              🧹 Clear All Data
            </P>
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
