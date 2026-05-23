import React from "react";
import { View, ActivityIndicator } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import TipCard from "./TipCard";
import type { TipWithAuthor } from "~/types/Review";

interface TipsListProps {
  tips: TipWithAuthor[] | undefined;
  isLoading: boolean;
  currentUserId: string | null;
  onAddTip: () => void;
  onEditTip: (tip: TipWithAuthor) => void;
  onDeleteTip: (tipId: string) => void;
  onToggleTipHelpful: (tipId: string) => void;
}

export default function TipsList({
  tips,
  isLoading,
  currentUserId,
  onAddTip,
  onEditTip,
  onDeleteTip,
  onToggleTipHelpful,
}: TipsListProps) {
  return (
    <View className="mb-6">
      <Separator className="mb-6" />

      <View className="flex-row items-center justify-between mb-4">
        <H4 className="font-urbanist-bold">Tips &amp; Modifications</H4>
        <Button size="sm" variant="outline" className="rounded-2xl" onPress={onAddTip}>
          <Small className="font-urbanist-semibold text-foreground">Add a Tip</Small>
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" className="py-4" />
      ) : !tips?.length ? (
        <View className="py-4 items-center">
          <P className="text-muted-foreground text-center text-sm">
            No tips yet. Share your modifications!
          </P>
        </View>
      ) : (
        tips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            isOwnTip={tip.userId === currentUserId}
            onEdit={onEditTip}
            onDelete={onDeleteTip}
            onToggleHelpful={onToggleTipHelpful}
          />
        ))
      )}
    </View>
  );
}
