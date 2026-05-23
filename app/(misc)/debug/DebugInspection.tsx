import React from "react";
import { View, ActivityIndicator } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import type Recipe from "~/data/db/models/Recipe";
import { SectionHeader } from "./SectionHeader";
import type { DebugRecipe } from "./types";

interface StockItem {
  name: string;
  quantity: number;
  unit: string;
}

interface PartialRecipe {
  recipe: Recipe;
  completionPercentage: number;
}

interface Recommendations {
  canMake: Recipe[];
  partiallyCanMake: PartialRecipe[];
}

interface DebugInspectionProps {
  inspectionLoading: boolean;
  stockItems: StockItem[];
  recipes: DebugRecipe[];
  recommendations: Recommendations | null;
  onLoadData: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugInspection({
  inspectionLoading,
  stockItems,
  recipes,
  recommendations,
  onLoadData,
  expanded,
  onToggle,
}: DebugInspectionProps) {
  return (
    <>
      <SectionHeader
        title="Database Inspection"
        icon={"\u{1F50D}"}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4">
          {!inspectionLoading && stockItems.length === 0 && recipes.length === 0 ? (
            <Button onPress={onLoadData} variant="outline" className="w-full mb-3">
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
                <H3 className="mb-2">
                  {"\u{1F4E6}"} Stock Items ({stockItems.length})
                </H3>
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
                <H3 className="mb-2">
                  {"\u{1F4DA}"} Recipes ({recipes.length} total)
                </H3>
                {recipes.length === 0 ? (
                  <P className="text-muted-foreground ml-2">No recipes in local database</P>
                ) : (
                  recipes.map((recipe, i) => (
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
                <H3 className="mb-2">{"\u{1F3AF}"} Recommendations</H3>
                {recommendations ? (
                  <>
                    <P className="ml-2">
                      {"✅"} Can make: {recommendations.canMake.length} recipes
                    </P>
                    {recommendations.canMake.slice(0, 3).map((r, i) => (
                      <P key={i} className="ml-6 text-sm">
                        • {r.title}
                      </P>
                    ))}

                    <P className="ml-2 mt-2">
                      {"\u{1F736}"} Partial: {recommendations.partiallyCanMake.length} recipes
                    </P>
                    {recommendations.partiallyCanMake.slice(0, 3).map((item, i) => (
                      <P key={i} className="ml-6 text-sm">
                        • {item.recipe.title} ({item.completionPercentage}%)
                      </P>
                    ))}
                  </>
                ) : (
                  <P className="text-muted-foreground ml-2">No recommendations loaded</P>
                )}
              </View>

              <Button onPress={onLoadData} variant="outline" className="w-full" size="sm">
                <P className="text-foreground font-medium">{"\u{1F504}"} Reload Inspection</P>
              </Button>
            </>
          )}
        </View>
      )}
    </>
  );
}
