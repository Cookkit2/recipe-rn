import React from "react";
import { View, Pressable } from "react-native";
import { P, Small } from "~/components/ui/typography";
import HelpfulButton from "~/components/ui/HelpfulButton";
import type { TipWithAuthor } from "~/types/Review";

interface TipCardProps {
  tip: TipWithAuthor;
  isOwnTip: boolean;
  onEdit: (tip: TipWithAuthor) => void;
  onDelete: (tipId: string) => void;
  onToggleHelpful: (tipId: string) => void;
}

export default function TipCard({
  tip,
  isOwnTip,
  onEdit,
  onDelete,
  onToggleHelpful,
}: TipCardProps) {
  return (
    <View className="py-3 border-b border-border/50">
      <View className="flex-row items-center gap-2 mb-1.5">
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: tip.authorColor + "30" }}
        >
          <Small className="text-xs font-urbanist-bold" style={{ color: tip.authorColor }}>
            {tip.authorInitial}
          </Small>
        </View>
        <Small className="text-muted-foreground">
          {new Date(tip.createdAt).toLocaleDateString()}
        </Small>
      </View>

      <P className="text-foreground/80 font-urbanist-regular text-sm mb-2">{tip.body}</P>

      <View className="flex-row items-center justify-between">
        <HelpfulButton
          count={tip.helpfulCount}
          isVoted={false}
          onPress={() => onToggleHelpful(tip.id)}
        />
        {isOwnTip && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => onEdit(tip)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit tip"
            >
              <Small className="text-primary">Edit</Small>
            </Pressable>
            <Pressable
              onPress={() => onDelete(tip.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete tip"
            >
              <Small className="text-destructive">Delete</Small>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
