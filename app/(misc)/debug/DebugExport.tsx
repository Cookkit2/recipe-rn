import React from "react";
import { View, Alert } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { storage } from "~/data";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { recipeApi } from "~/data/api/recipeApi";
import { mealPlanApi } from "~/data/api/mealPlanApi";
import {
  PREF_APPLIANCES_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
  PREF_DIET_KEY,
} from "~/constants/storage-keys";
import { log } from "~/utils/logger";
import { SectionHeader } from "./SectionHeader";

interface DebugExportProps {
  isLoading: boolean;
  onSetLoading: (loading: boolean) => void;
  onFetchMealPlanData: () => Promise<Array<unknown>>;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugExport({
  isLoading,
  onSetLoading,
  onFetchMealPlanData,
  expanded,
  onToggle,
}: DebugExportProps) {
  const printLocalStorage = () => {
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
  };

  const printIngredients = async () => {
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
  };

  const printPreferences = () => {
    try {
      const appliances = storage.getString(PREF_APPLIANCES_KEY) ?? "";
      const diet = storage.getString(PREF_DIET_KEY) ?? "none";
      const allergens = storage.getString(PREF_ALLERGENS_KEY) ?? "";
      const otherAllergens = storage.getString(PREF_OTHER_ALLERGENS_KEY) ?? "";

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
      Alert.alert("Preferences Logged", "User preferences logged to console. Check your logs.");
    } catch (error) {
      log.error("Failed to get preferences:", error);
      Alert.alert("Error", "Failed to get preferences");
    }
  };

  const printRecommendedRecipes = async () => {
    try {
      onSetLoading(true);
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
      Alert.alert("Recipes Logged", `${output.length} recommendations logged. Check your logs.`);
    } catch (error) {
      log.error("Failed to get recommendations:", error);
      Alert.alert("Error", "Failed to get recommendations");
    } finally {
      onSetLoading(false);
    }
  };

  const printMealPlan = async () => {
    try {
      const items = await onFetchMealPlanData();
      const jsonOutput = JSON.stringify(items, null, 2);
      log.info("Meal Plan Data:", jsonOutput);
      Alert.alert(
        "Meal Plan Logged",
        `${items.length} meal plan items logged to console. Check your logs.`
      );
    } catch (error) {
      log.error("Failed to get meal plan:", error);
      Alert.alert("Error", "Failed to get meal plan data");
    }
  };

  return (
    <>
      <SectionHeader
        title="Export & Logging"
        icon={"\u{1F4E4}"}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button
            onPress={printLocalStorage}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">{"\u{1F4BE}"} Print Local Storage</P>
          </Button>

          <Button
            onPress={printIngredients}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">{"\u{1F4C4}"} Print Ingredients JSON</P>
          </Button>

          <Button
            onPress={printPreferences}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">{"⚙️"} Print User Preferences</P>
          </Button>

          <Button
            onPress={printRecommendedRecipes}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <P className="text-foreground font-medium">{"\u{1F373}"} Print Recommended Recipes</P>
          </Button>

          <Button onPress={printMealPlan} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F4C5}"} Print Meal Plan JSON</P>
          </Button>
        </View>
      )}
    </>
  );
}
