import React from "react";
import { View } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { SectionHeader } from "./SectionHeader";

interface DebugStatsProps {
  stats: {
    totalRecords: number;
    recipes: number;
    ingredients?: number;
    stockItems: number;
    categories?: number;
  } | null;
  mealPlanData: Array<{
    id: string;
    servings: number;
    recipe?: {
      title?: string | null;
      ingredients?: ReadonlyArray<unknown>;
    } | null;
  }>;
  isLoading: boolean;
  onRefreshStats: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugStats({
  stats,
  mealPlanData,
  isLoading,
  onRefreshStats,
  expanded,
  onToggle,
}: DebugStatsProps) {
  return (
    <>
      <SectionHeader
        title="Database Stats"
        icon={"\u{1F4CA}"}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4">
          {stats ? (
            <>
              <P>
                {"\u{1F4CA}"} Total Records: {stats.totalRecords}
              </P>
              <P>
                {"\u{1F373}"} Recipes: {stats.recipes}
              </P>
              <P>
                {"\u{1F955}"} Ingredients: {stats.ingredients ?? 0}
              </P>
              <P>
                {"\u{1F4E6}"} Stock Items: {stats.stockItems}
              </P>
              <P>
                {"\u{1F3F7}️"} Categories: {stats.categories ?? 0}
              </P>
              <P>
                {"\u{1F4C5}"} Meal Plan Items: {mealPlanData.length}
              </P>

              {/* Meal Plan Display */}
              {mealPlanData.length > 0 && (
                <View className="mt-4 pt-4 border-t border-border">
                  <H3 className="mb-3">{"\u{1F4C5}"} Current Meal Plan</H3>
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
            onPress={onRefreshStats}
            disabled={isLoading}
            variant="outline"
            className="w-full mt-3"
            size="sm"
          >
            <P className="text-foreground font-medium">{"\u{1F504}"} Refresh Stats</P>
          </Button>
        </View>
      )}
    </>
  );
}
