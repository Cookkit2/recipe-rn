import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SheetModalWrapper from "~/components/Shared/SheetModalWrapper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { H2, H3, H4, Muted, P } from "~/components/ui/typography";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Trash2Icon, CalendarIcon, SaveIcon, ShareIcon, DownloadIcon } from "lucide-uniwind";
import { useTemplateSheet } from "~/hooks/useTemplateSheet";

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
const TemplateSheetMemo = function TemplateSheet({
  onTemplateApplied,
  onClose,
}: TemplateSheetProps) {
  const { bottom } = useSafeAreaInsets();

  const {
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
    isSavePending,
    isApplyPending,
    isDeletePending,
    handleSaveAsTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
    handleClose,
    handleExportMealPlan,
    handleImportMealPlan,
  } = useTemplateSheet({ onTemplateApplied, onClose });
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
                    disabled={isSaving || !templateName.trim() || isSavePending}
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
                                disabled={isApplyPending}
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
                                disabled={isDeletePending}
                                accessibilityLabel="Delete template"
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
};

// Export with React.memo for performance optimization
// Only re-render when onTemplateApplied or onClose callbacks change
export default React.memo(TemplateSheetMemo, (prevProps, nextProps) => {
  return (
    prevProps.onTemplateApplied === nextProps.onTemplateApplied &&
    prevProps.onClose === nextProps.onClose
  );
});
