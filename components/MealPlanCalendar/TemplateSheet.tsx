import React, { useCallback, useState } from "react";
import { View, Alert, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SheetModalWrapper from "~/components/Shared/SheetModalWrapper";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import {
  useMealPlanTemplates,
  useSaveWeekAsTemplate,
  useApplyTemplate,
  useDeleteTemplate,
} from "~/hooks/queries/useMealPlanTemplateQueries";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { H2, H3, H4, Muted, P } from "~/components/ui/typography";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Trash2Icon, CalendarIcon, SaveIcon, ShareIcon, DownloadIcon } from "lucide-uniwind";
import { log } from "~/utils/logger";
import { recipeApi } from "~/data/api/recipeApi";
import type { MealPlanTemplateData } from "~/data/api/mealPlanTemplateApi";
import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";
import { safeJsonParse } from "~/utils/json-parsing";

/**
 * Shareable meal plan data structure for JSON export/import
 */
interface ShareableMealPlan {
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

interface TemplateSheetProps {
  /**
   * Callback when a template is applied
   */
  onTemplateApplied?: () => void;
  /**
   * Callback when the sheet is closed
   */
  onClose?: () => void;
}

/**
 * TemplateSheet Component
 *
 * Displays a sheet for managing meal plan templates:
 * - View all saved templates
 * - Save current week's meal plan as a template
 * - Apply a template to the current week
 * - Delete templates
 */
export default function TemplateSheet({ onTemplateApplied, onClose }: TemplateSheetProps) {
  const { selectedWeek } = useMealPlanCalendar();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const { data: templates, isLoading } = useMealPlanTemplates();
  const saveWeekAsTemplate = useSaveWeekAsTemplate();
  const applyTemplate = useApplyTemplate();
  const deleteTemplate = useDeleteTemplate();

  // Get current week's meal plans for export
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

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

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

  /**
   * Export current week's meal plan as shareable JSON
   */
  const handleExportMealPlan = useCallback(async () => {
    if (!currentWeekMeals || currentWeekMeals.length === 0) {
      Alert.alert("Export Error", "No meals planned for this week. Add some meals first!");
      return;
    }

    try {
      setIsExporting(true);
      handleHapticFeedback();

      // Create shareable meal plan data
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

      // Convert to JSON string
      const jsonString = JSON.stringify(shareableData, null, 2);

      // Try to share using React Native Share API
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
          handleHapticFeedback();
          log.info("Meal plan shared successfully");
        }
      } catch (shareError) {
        // If share is dismissed or fails, show the JSON in an alert
        if ((shareError as any)?.code !== "SHARE_DISMISSED") {
          log.warn("Share failed, showing JSON in alert:", shareError);
          Alert.alert("Meal Plan JSON", "Copy this JSON to share your meal plan:", [
            { text: "Close", style: "cancel" },
            {
              text: "Copy",
              onPress: () => {
                // Note: Clipboard API would need expo-clipboard
                Alert.alert(
                  "Info",
                  "JSON ready to be copied manually (clipboard feature coming soon)"
                );
              },
            },
          ]);
        }
      }
    } catch (error) {
      log.error("Error exporting meal plan:", error);
      Alert.alert("Export Error", "Failed to export meal plan");
    } finally {
      setIsExporting(false);
    }
  }, [currentWeekMeals, weekStart, weekEnd, handleHapticFeedback]);

  /**
   * Import a meal plan from JSON
   */
  const handleImportMealPlan = useCallback(() => {
    Alert.prompt(
      "Import Meal Plan",
      "Paste the JSON data of the meal plan you want to import:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: async (jsonString: string | undefined) => {
            if (!jsonString || !jsonString.trim()) {
              Alert.alert("Import Error", "Please enter JSON data");
              return;
            }

            try {
              setIsImporting(true);
              handleHapticFeedback();

              // Parse JSON safely to prevent JSON prototype injection
              // Provide a default empty structure that fails validation rather than crashing
              const data = safeJsonParse<ShareableMealPlan>(jsonString.trim(), {
                version: "",
                exportDate: "",
                mealPlans: []
              });

              // Validate data structure
              if (!data.version || !data.mealPlans || !Array.isArray(data.mealPlans)) {
                Alert.alert("Import Error", "Invalid meal plan format");
                return;
              }

              // Import meal plans
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

                  // Search for recipe by title
                  const matchingRecipes = await recipeApi.searchRecipes(mealPlan.recipe.title);

                  if (!matchingRecipes || matchingRecipes.length === 0) {
                    log.warn(`Recipe not found: ${mealPlan.recipe.title}`);
                    skippedRecipes.push(mealPlan.recipe.title);
                    errorCount++;
                    continue;
                  }

                  // Use the first matching recipe (safe because we checked length above)
                  const matchedRecipe = matchingRecipes[0]!;
                  const mealDate = new Date(mealPlan.date);

                  // Add to meal plan
                  await addToMealPlan.mutateAsync({
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

              handleHapticFeedback();

              if (errorCount === 0 && successCount > 0) {
                Alert.alert(
                  "Import Success",
                  `Imported ${successCount} meal${successCount !== 1 ? "s" : ""} to your plan!`
                );
                onTemplateApplied?.();
              } else if (successCount > 0) {
                const skippedList = skippedRecipes.slice(0, 3).join("\n");
                const moreText =
                  skippedRecipes.length > 3 ? `\n... and ${skippedRecipes.length - 3} more` : "";
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
            } catch (parseError) {
              log.error("Error parsing import JSON:", parseError);
              Alert.alert("Import Error", "Invalid JSON format. Please check and try again.");
            } finally {
              setIsImporting(false);
            }
          },
        },
      ],
      Platform.OS === "ios" ? "plain-text" : "default"
    );
  }, [handleHapticFeedback, onTemplateApplied, addToMealPlan]);

  return (
    <SheetModalWrapper>
      {({ ScrollComponent, scrollRef }) => (
        <View className="flex-1 bg-background" style={{ paddingBottom: bottom }}>
          {/* Header */}
          <View className="px-6 pt-6 pb-4 border-b border-border">
            <H2 className="font-bowlby-one text-3xl">Meal Plan Templates</H2>
            <Muted className="mt-1">Save and reuse weekly meal plans</Muted>
          </View>

          <ScrollComponent className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-6">
              {/* Save Current Week as Template */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex-row items-center gap-2">
                    <SaveIcon size={20} className="text-primary" />
                    Save Current Week as Template
                  </CardTitle>
                  <CardDescription>
                    Save your planned meals for this week to use later
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <Input
                    placeholder="Template name (e.g., 'Family Favorites')"
                    value={templateName}
                    onChangeText={setTemplateName}
                    editable={!isSaving}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={templateDescription}
                    onChangeText={setTemplateDescription}
                    editable={!isSaving}
                  />
                  <Button
                    onPress={handleSaveAsTemplate}
                    disabled={isSaving || !templateName.trim() || saveWeekAsTemplate.isPending}
                    variant="default"
                    className="mt-2"
                  >
                    <H4 className="text-primary-foreground font-urbanist font-semibold">
                      {isSaving ? "Saving..." : "Save as Template"}
                    </H4>
                  </Button>
                </CardContent>
              </Card>

              {/* Templates List */}
              <View className="mb-4">
                <H3 className="mb-3 px-1">Your Templates</H3>

                {isLoading ? (
                  <View className="items-center justify-center py-8">
                    <Muted>Loading templates...</Muted>
                  </View>
                ) : !templates || templates.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Muted>No templates saved yet</Muted>
                    <Muted className="text-sm mt-1">Create your first template above</Muted>
                  </View>
                ) : (
                  <View className="gap-3">
                    {templates.map((template) => (
                      <Card key={template.id}>
                        <CardContent className="p-4">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 gap-1">
                              <H4 className="text-foreground">{template.name}</H4>
                              {template.description ? (
                                <P className="text-sm text-muted-foreground">
                                  {template.description}
                                </P>
                              ) : null}
                              <View className="flex-row items-center gap-1 mt-2">
                                <CalendarIcon size={14} className="text-muted-foreground" />
                                <Muted className="text-xs">{template.mealSlots.length} meals</Muted>
                              </View>
                            </View>

                            <View className="flex-row items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() => handleApplyTemplate(template.id)}
                                disabled={applyTemplate.isPending}
                                className="flex-1"
                              >
                                <P className="text-foreground text-sm font-urbanist-medium">
                                  Apply
                                </P>
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onPress={() => handleDeleteTemplate(template)}
                                disabled={deleteTemplate.isPending}
                              >
                                <Trash2Icon size={16} className="text-destructive" />
                              </Button>
                            </View>
                          </View>
                        </CardContent>
                      </Card>
                    ))}
                  </View>
                )}
              </View>

              {/* Share Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex-row items-center gap-2">
                    <ShareIcon size={20} className="text-primary" />
                    Share Meal Plan
                  </CardTitle>
                  <CardDescription>
                    Export your current week's plan or import a shared plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <View className="flex-row gap-3">
                    <Button
                      onPress={handleExportMealPlan}
                      disabled={isExporting || !currentWeekMeals || currentWeekMeals.length === 0}
                      variant="default"
                      className="flex-1"
                    >
                      <ShareIcon size={16} className="text-primary-foreground mr-2" />
                      <H4 className="text-primary-foreground font-urbanist font-semibold">
                        {isExporting ? "Exporting..." : "Export"}
                      </H4>
                    </Button>
                    <Button
                      onPress={handleImportMealPlan}
                      disabled={isImporting}
                      variant="outline"
                      className="flex-1"
                    >
                      <DownloadIcon size={16} className="text-foreground mr-2" />
                      <H4 className="text-foreground font-urbanist font-semibold">
                        {isImporting ? "Importing..." : "Import"}
                      </H4>
                    </Button>
                  </View>
                  {!currentWeekMeals || currentWeekMeals.length === 0 ? (
                    <Muted className="text-xs text-center mt-1">
                      Add meals to this week to enable export
                    </Muted>
                  ) : (
                    <Muted className="text-xs text-center mt-1">
                      {currentWeekMeals.length} meal{currentWeekMeals.length !== 1 ? "s" : ""} this
                      week
                    </Muted>
                  )}
                </CardContent>
              </Card>

              {/* Close Button */}
              <Button onPress={handleClose} variant="outline" className="mt-4">
                <H4 className="text-foreground font-urbanist font-semibold">Close</H4>
              </Button>
            </View>
          </ScrollComponent>
        </View>
      )}
    </SheetModalWrapper>
  );
}
