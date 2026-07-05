import React, { useState } from "react";
import { View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { StarIcon } from "lucide-uniwind";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import BaseModal from "~/components/ui/modal";
import { cn } from "~/lib/utils";

interface RateRecipeModalProps {
  modalVisible: boolean;
  onCancel: () => void;
  onSave: (rating: number | undefined, notes: string) => void;
  onSkip: () => void;
  isSaving: boolean;
}

export default function RateRecipeModal({
  modalVisible,
  onCancel,
  onSave,
  onSkip,
  isSaving,
}: RateRecipeModalProps) {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const handleStarPress = (starValue: number) => {
    setRating(starValue);
  };

  const handleSave = () => {
    onSave(rating, notes);
    // Reset form after save
    setRating(undefined);
    setNotes("");
  };

  const handleCancel = () => {
    setRating(undefined);
    setNotes("");
    onCancel();
  };

  const handleSkip = () => {
    setRating(undefined);
    setNotes("");
    onSkip();
  };

  return (
    <BaseModal modalVisible={modalVisible} onCancel={handleCancel}>
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous">
        <H4 className="font-urbanist-bold text-foreground text-center mb-2">
          How was your recipe?
        </H4>
        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mb-6">
          Rate your cooking experience and add any notes
        </P>

        {/* Star Rating */}
        <View className="flex-row justify-center items-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((starValue) => (
            <Pressable
              key={starValue}
              onPress={() => handleStarPress(starValue)}
              className="p-1"
              accessibilityLabel={`Rate ${starValue} stars`}
              accessibilityHint={rating === starValue ? "Selected" : "Tap to rate"}
            >
              <StarIcon
                size={32}
                strokeWidth={2}
                className={cn(
                  "transition-colors",
                  rating !== undefined && starValue <= rating
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                )}
              />
            </Pressable>
          ))}
        </View>

        {/* Rating Labels */}
        {rating !== undefined && (
          <P className="text-center text-sm font-urbanist-medium text-foreground mb-4">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </P>
        )}

        {/* Notes Input */}
        <View className="mb-4">
          <P className="text-sm font-urbanist-medium text-foreground mb-2">Notes (optional)</P>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add your cooking notes, modifications, or suggestions..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="w-full min-h-[100px] rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSaving}
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onPress={handleSkip}
            disabled={isSaving}
          >
            <P className="font-urbanist-semibold text-foreground">Skip</P>
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving && <ActivityIndicator size="small" color={"white"} />}
            <P className="font-urbanist-semibold text-background">Save</P>
          </Button>
        </View>
      </View>
    </BaseModal>
  );
}
