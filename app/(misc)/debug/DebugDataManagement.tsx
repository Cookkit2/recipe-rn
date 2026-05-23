import React from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { SectionHeader } from "./SectionHeader";

interface DebugDataManagementProps {
  isLoading: boolean;
  onClearMealPlan: () => void;
  onClearRecipes: () => void;
  onClearAll: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugDataManagement({
  isLoading,
  onClearMealPlan,
  onClearRecipes,
  onClearAll,
  expanded,
  onToggle,
}: DebugDataManagementProps) {
  return (
    <>
      <SectionHeader
        title="Data Management"
        icon={"\u{1F5C4}️"}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button
            onPress={onClearMealPlan}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">{"\u{1F4C5}"} Clear Meal Plan</P>
          </Button>

          <Button
            onPress={onClearRecipes}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">{"\u{1F9F9}"} Clear Recipes</P>
          </Button>

          <Button
            onPress={onClearAll}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            <P className="text-destructive-foreground font-medium">{"\u{1F9F9}"} Clear All Data</P>
          </Button>
        </View>
      )}
    </>
  );
}
