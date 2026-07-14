import React from "react";
import { Pressable, View } from "react-native";
import { ThumbsUpIcon } from "lucide-uniwind";
import { Small } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface HelpfulButtonProps {
  count: number;
  isVoted: boolean;
  onPress: () => void;
  className?: string;
}

export default function HelpfulButton({ count, isVoted, onPress, className }: HelpfulButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel="Mark as helpful"
      accessibilityRole="button"
      accessibilityHint="Toggles your helpful vote for this review"
      accessibilityState={{ selected: isVoted }}
    >
      <View className={cn("flex-row items-center gap-1.5", className)}>
        <ThumbsUpIcon
          size={14}
          strokeWidth={2}
          className={cn(isVoted ? "text-primary fill-primary/30" : "text-muted-foreground")}
        />
        {count > 0 && (
          <Small className={cn(isVoted ? "text-primary" : "text-muted-foreground")}>{count}</Small>
        )}
      </View>
    </Pressable>
  );
}
