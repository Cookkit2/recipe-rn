import { useCallback, useState } from "react";
import { Alert, Share, Platform } from "react-native";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import {
  useMealPlanTemplates,
  useSaveWeekAsTemplate,
  useApplyTemplate,
  useDeleteTemplate,
} from "~/hooks/queries/useMealPlanTemplateQueries";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { log } from "~/utils/logger";
import { recipeApi } from "~/data/api/recipeApi";
import type { MealPlanTemplateData } from "~/data/api/mealPlanTemplateApi";
import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";
import { safeJsonParse } from "~/utils/json-parsing";
import { useSelectionHaptic } from "~/hooks/useSelectionHaptic";

/**
 * Shareable meal plan data structure for JSON export/import
 */
export interface ShareableMealPlan {
  version: string;
  exportDate: string;
  mealPlans: Array<{
    date: string;
    mealSlot: string;
    servings: number;
    recipe: {
      title: string;
      servings: number;
      ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
      }>;
    } | null;
  }>;
}

/**
 * Generates a shareable meal plan JSON string from an array of meal plans
 */
export function generateShareableMealPlan(currentWeekMeals: MealPlanItemWithRecipe[]): string {
  const shareableData: ShareableMealPlan = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    mealPlans: currentWeekMeals.map((meal) => ({
      date: meal.date.toISOString(),
      mealSlot: meal.mealSlot,
      servings: meal.servings,
      recipe: meal.recipe
        ? {
            title: meal.recipe.title,
            servings: meal.recipe.servings,
            ingredients: meal.recipe.ingredients,
          }
        : null,
    })),
  };
  return JSON.stringify(shareableData, null, 2);
}

/**
 * Shares the meal plan JSON string using the React Native Share API
 */
export async function shareMealPlanJson(
  jsonString: string,
  weekStart: Date,
  weekEnd: Date,
  onShared: () => void
) {
  try {
    const result = await Share.share({
      message: Platform.select({
        ios: `My Meal Plan for ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}\n\nCopy the JSON below to import this meal plan:\n\n${jsonString}`,
        android: `My Meal Plan:\n\n${jsonString}`,
        default: jsonString,
      }) as string,
      title: "Share Meal Plan",
    });

    if (result.action === Share.sharedAction) {
      onShared();
      log.info("Meal plan shared successfully");
    }
  } catch (shareError) {
    if ((shareError as any)?.code !== "SHARE_DISMISSED") {
      log.warn("Share failed, showing JSON in alert:", shareError);
      Alert.alert("Meal Plan JSON", "Copy this JSON to share your meal plan:", [
        { text: "Close", style: "cancel" },
        {
          text: "Copy",
          onPress: () => {
            Alert.alert("Info", "JSON ready to be copied manually (clipboard feature coming soon)");
          },
        },
      ]);
    }
  }
}

/**
 * Parses and validates import data JSON string
 */
export function parseImportData(jsonString: string): ShareableMealPlan {
  const data = safeJsonParse<ShareableMealPlan>(jsonString.trim(), {
    version: "",
    exportDate: "",
    mealPlans: [],
  });
  if (!data.version || !data.mealPlans || !Array.isArray(data.mealPlans)) {
    throw new Error("Invalid meal plan format");
  }
  return data;
}

/**
 * Processes importing meals from parsed data and adds them to the database
 */
export async function importMealsFromData(
  data: ShareableMealPlan,
  addToMealPlanAsync: (args: {
    recipeId: string;
    servings: number;
    date: Date;
    mealSlot: string;
  }) => Promise<any>
): Promise<{ successCount: number; errorCount: number; skippedRecipes: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const skippedRecipes: string[] = [];

  for (const mealPlan of data.mealPlans) {
    try {
      if (!mealPlan.recipe) {
        log.warn("Skipping meal plan without recipe data");
        errorCount++;
        continue;
      }

      const matchingRecipes = await recipeApi.searchRecipes(mealPlan.recipe.title);

      if (!matchingRecipes || matchingRecipes.length === 0) {
        log.warn(`Recipe not found: ${mealPlan.recipe.title}`);
        skippedRecipes.push(mealPlan.recipe.title);
        errorCount++;
        continue;
      }

      const matchedRecipe = matchingRecipes[0]!;
      const mealDate = new Date(mealPlan.date);

      await addToMealPlanAsync({
        recipeId: matchedRecipe.id,
        servings: mealPlan.servings,
        date: mealDate,
        mealSlot: mealPlan.mealSlot,
      });

      successCount++;
      log.info(`Imported meal: ${mealPlan.recipe.title}`);
    } catch (err) {
      log.error("Error importing meal plan item:", err);
      errorCount++;
    }
  }

  return { successCount, errorCount, skippedRecipes };
}

/**
 * Displays the results of the import process
 */
export function showImportResults(
  successCount: number,
  errorCount: number,
  skippedRecipes: string[],
  onTemplateApplied?: () => void
) {
  if (errorCount === 0 && successCount > 0) {
    Alert.alert(
      "Import Success",
      `Imported ${successCount} meal${successCount !== 1 ? "s" : ""} to your plan!`
    );
    onTemplateApplied?.();
  } else if (successCount > 0) {
    const skippedList = skippedRecipes.slice(0, 3).join("\n");
    const moreText = skippedRecipes.length > 3 ? `\n... and ${skippedRecipes.length - 3} more` : "";
    Alert.alert(
      "Import Partial",
      `Imported ${successCount} meal${successCount !== 1 ? "s" : ""}, ${errorCount} skipped.\n\nSkipped recipes:\n${skippedList}${moreText}`
    );
    onTemplateApplied?.();
  } else {
    Alert.alert(
      "Import Failed",
      "No meals could be imported. Make sure you have the recipes in your collection that match the shared plan."
    );
  }
}

export interface UseTemplateSheetProps {
  onTemplateApplied?: () => void;
  onClose?: () => void;
}

export function useTemplateSheet({ onTemplateApplied, onClose }: UseTemplateSheetProps = {}) {
  const { selectedWeek } = useMealPlanCalendar();

  const { data: templates, isLoading } = useMealPlanTemplates();
  const saveWeekAsTemplate = useSaveWeekAsTemplate();
  const applyTemplate = useApplyTemplate();
  const deleteTemplate = useDeleteTemplate();

  const weekStart = new Date(selectedWeek);
  const weekEnd = new Date(selectedWeek);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const { data: currentWeekMeals } = useCalendarMealPlans(weekStart, weekEnd);
  const addToMealPlan = useAddToMealPlan();

  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleHapticFeedback = useSelectionHaptic();

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }

    try {
      setIsSaving(true);
      handleHapticFeedback();

      const result = await saveWeekAsTemplate.mutateAsync({
        startDate: selectedWeek,
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
      });

      if (result) {
        handleHapticFeedback();
        setTemplateName("");
        setTemplateDescription("");
        Alert.alert("Success", "Template saved successfully!");
      } else {
        Alert.alert(
          "Error",
          "Failed to save template. Make sure you have meals planned for this week."
        );
      }
    } catch (error) {
      log.error("Error saving template:", error);
      Alert.alert("Error", "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }, [templateName, templateDescription, selectedWeek, saveWeekAsTemplate, handleHapticFeedback]);

  const handleApplyTemplate = useCallback(
    async (templateId: string) => {
      Alert.alert(
        "Apply Template",
        "This will add meals from the template to your current week. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Apply",
            style: "default",
            onPress: async () => {
              try {
                handleHapticFeedback();
                const success = await applyTemplate.mutateAsync({
                  templateId,
                  startDate: selectedWeek,
                  overwriteExisting: false,
                });

                if (success) {
                  handleHapticFeedback();
                  onTemplateApplied?.();
                  Alert.alert("Success", "Template applied successfully!");
                } else {
                  Alert.alert("Error", "Failed to apply template");
                }
              } catch (error) {
                log.error("Error applying template:", error);
                Alert.alert("Error", "Failed to apply template");
              }
            },
          },
        ]
      );
    },
    [selectedWeek, applyTemplate, onTemplateApplied, handleHapticFeedback]
  );

  const handleDeleteTemplate = useCallback(
    (template: MealPlanTemplateData) => {
      Alert.alert("Delete Template", `Are you sure you want to delete "${template.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              handleHapticFeedback();
              await deleteTemplate.mutateAsync(template.id);
              handleHapticFeedback();
            } catch (error) {
              log.error("Error deleting template:", error);
              Alert.alert("Error", "Failed to delete template");
            }
          },
        },
      ]);
    },
    [deleteTemplate, handleHapticFeedback]
  );

  const handleClose = useCallback(() => {
    handleHapticFeedback();
    onClose?.();
  }, [handleHapticFeedback, onClose]);

  const handleExportMealPlan = useCallback(async () => {
    if (!currentWeekMeals || currentWeekMeals.length === 0) {
      Alert.alert("Export Error", "No meals planned for this week. Add some meals first!");
      return;
    }

    try {
      setIsExporting(true);
      handleHapticFeedback();

      const jsonString = generateShareableMealPlan(currentWeekMeals);
      await shareMealPlanJson(jsonString, weekStart, weekEnd, handleHapticFeedback);
    } catch (error) {
      log.error("Error exporting meal plan:", error);
      Alert.alert("Export Error", "Failed to export meal plan");
    } finally {
      setIsExporting(false);
    }
  }, [currentWeekMeals, weekStart, weekEnd, handleHapticFeedback]);

  const processMealPlanImport = useCallback(
    async (jsonString: string | undefined) => {
      if (!jsonString || !jsonString.trim()) {
        Alert.alert("Import Error", "Please enter JSON data");
        return;
      }

      try {
        setIsImporting(true);
        handleHapticFeedback();

        let data: ShareableMealPlan;
        try {
          data = parseImportData(jsonString);
        } catch (err) {
          Alert.alert("Import Error", (err as Error).message || "Invalid meal plan format");
          return;
        }

        const { successCount, errorCount, skippedRecipes } = await importMealsFromData(
          data,
          addToMealPlan.mutateAsync
        );
        handleHapticFeedback();
        showImportResults(successCount, errorCount, skippedRecipes, onTemplateApplied);
      } catch (parseError) {
        log.error("Error parsing import JSON:", parseError);
        Alert.alert("Import Error", "Invalid JSON format. Please check and try again.");
      } finally {
        setIsImporting(false);
      }
    },
    [handleHapticFeedback, addToMealPlan.mutateAsync, onTemplateApplied]
  );

  const handleImportMealPlan = useCallback(() => {
    Alert.prompt(
      "Import Meal Plan",
      "Paste the JSON data of the meal plan you want to import:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: processMealPlanImport,
        },
      ],
      Platform.OS === "ios" ? "plain-text" : "default"
    );
  }, [processMealPlanImport]);

  return {
    templates,
    isLoading,
    currentWeekMeals,
    isSaving,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    isExporting,
    isImporting,
    isSavePending: saveWeekAsTemplate.isPending,
    isApplyPending: applyTemplate.isPending,
    isDeletePending: deleteTemplate.isPending,
    handleSaveAsTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
    handleClose,
    handleExportMealPlan,
    handleImportMealPlan,
  };
}
