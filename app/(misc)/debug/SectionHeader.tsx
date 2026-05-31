import React from "react";
import { Pressable } from "react-native";
import { H3 } from "~/components/ui/typography";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-uniwind";

interface SectionHeaderProps {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
}

export function SectionHeader({ title, icon, expanded, onToggle }: SectionHeaderProps) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center justify-between bg-card p-4 rounded-lg mb-2"
      accessibilityRole="button"
      accessibilityLabel={expanded ? `Collapse ${title}` : `Expand ${title}`}
      accessibilityState={{ expanded }}
    >
      <H3>
        {icon} {title}
      </H3>
      {expanded ? (
        <ChevronUpIcon className="text-foreground" size={20} />
      ) : (
        <ChevronDownIcon className="text-foreground" size={20} />
      )}
    </Pressable>
  );
}
