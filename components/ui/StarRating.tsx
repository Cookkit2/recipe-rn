import React from "react";
import { View, Pressable } from "react-native";
import { StarIcon } from "lucide-uniwind";
import { cn } from "~/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  return (
    <View className={cn("flex-row items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);

        const star = (
          <StarIcon
            size={size}
            strokeWidth={1.5}
            className={cn(
              isFilled ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40"
            )}
          />
        );

        if (interactive) {
          return (
            <Pressable
              key={starValue}
              onPress={() => onRatingChange?.(starValue)}
              hitSlop={4}
              accessibilityLabel={`Rate ${starValue} stars`}
            >
              {star}
            </Pressable>
          );
        }

        return <View key={starValue}>{star}</View>;
      })}
    </View>
  );
}
