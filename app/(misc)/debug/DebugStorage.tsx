import React from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { storage } from "~/data";
import {
  ONBOARDING_COMPLETED_KEY,
  PREFERENCE_COMPLETED_KEY,
  RECIPE_COOKED_KEY,
} from "~/constants/storage-keys";
import { SectionHeader } from "./SectionHeader";

interface DebugStorageProps {
  expanded: boolean;
  onToggle: () => void;
}

export function DebugStorage({ expanded, onToggle }: DebugStorageProps) {
  return (
    <>
      <SectionHeader
        title="Storage Reset"
        icon={"\u{1F511}"}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={() => storage.delete(ONBOARDING_COMPLETED_KEY)} variant="outline">
            <P className="text-foreground">Clear Onboarding Key</P>
          </Button>
          <Button onPress={() => storage.delete(PREFERENCE_COMPLETED_KEY)} variant="outline">
            <P className="text-foreground">Clear Preference Key</P>
          </Button>
          <Button onPress={() => storage.delete(RECIPE_COOKED_KEY)} variant="outline">
            <P className="text-foreground">Clear Recipe Cooked Key</P>
          </Button>
        </View>
      )}
    </>
  );
}
