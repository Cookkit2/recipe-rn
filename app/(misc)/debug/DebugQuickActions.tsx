import React from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { SectionHeader } from "./SectionHeader";

interface DebugQuickActionsProps {
  isLoading: boolean;
  onSeedDatabase: () => void;
  onAddSample: () => void;
  onHealthCheck: () => void;
  onRefreshAll: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugQuickActions({
  isLoading,
  onSeedDatabase,
  onAddSample,
  onHealthCheck,
  onRefreshAll,
  expanded,
  onToggle,
}: DebugQuickActionsProps) {
  return (
    <>
      <SectionHeader title="Quick Actions" icon={"⚡"} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={onSeedDatabase} disabled={isLoading} className="w-full">
            <P className="text-primary-foreground font-medium">
              {"\u{1F331}"} {isLoading ? "Seeding..." : "Seed Full Database"}
            </P>
          </Button>

          <Button onPress={onAddSample} disabled={isLoading} variant="secondary" className="w-full">
            <P className="text-secondary-foreground font-medium">{"\u{1F3AF}"} Add Sample Data</P>
          </Button>

          <Button onPress={onHealthCheck} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F50D}"} Health Check</P>
          </Button>

          <Button onPress={onRefreshAll} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F504}"} Refresh UI Data</P>
          </Button>
        </View>
      )}
    </>
  );
}
