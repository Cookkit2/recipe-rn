import React, { useRef, useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { Trash2Icon, GripVerticalIcon } from "lucide-uniwind";
import { cn } from "~/lib/utils";
import type { RecipeStep } from "~/types/Recipe";

type EditStepItemProps = {
  step: RecipeStep;
  onChange: (step: RecipeStep) => void;
  onDelete: () => void;
  className?: string;
  dragHandle?: React.ReactNode;
};

export default function EditStepItem({
  step,
  onChange,
  onDelete,
  className,
  dragHandle,
}: EditStepItemProps) {
  const [titleHeight, setTitleHeight] = useState<number | undefined>(undefined);
  const [descriptionHeight, setDescriptionHeight] = useState<number | undefined>(undefined);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const titleInputStyle = React.useMemo(
    () => ({
      height: titleHeight,
      paddingVertical: 0,
      includeFontPadding: false,
    }),
    [titleHeight]
  );

  const descriptionInputStyle = React.useMemo(
    () => ({
      height: descriptionHeight,
      paddingVertical: 0,
      includeFontPadding: false,
      minHeight: 60,
    }),
    [descriptionHeight]
  );

  const handleTitleChange = (newTitle: string) => {
    onChange({ ...step, title: newTitle });
  };

  const handleDescriptionChange = (newDescription: string) => {
    onChange({ ...step, description: newDescription });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Step",
      `Are you sure you want to remove step "${step.title || "Untitled"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <View className={cn("gap-3 py-4 px-4 bg-card rounded-xl border-continuous", className)}>
      {/* Header Row - Drag Handle, Step Number, Title Input, Delete */}
      <View className="flex-row items-center gap-3">
        {/* Drag Handle */}
        {dragHandle || (
          <View className="w-6 h-10 flex items-center justify-center">
            <GripVerticalIcon className="text-muted-foreground" size={20} strokeWidth={2} />
          </View>
        )}

        {/* Step Number Badge */}
        <View className="min-w-8 h-8 flex items-center justify-center bg-muted rounded-lg">
          <P className="text-center font-urbanist-bold text-base text-foreground">{step.step}</P>
        </View>

        {/* Title Input */}
        <View className="flex-1">
          <TextInput
            ref={titleInputRef}
            value={step.title}
            onChangeText={handleTitleChange}
            placeholder="Step title"
            multiline={false}
            scrollEnabled={false}
            textAlignVertical="center"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="flex-1 text-base text-foreground font-urbanist-semibold bg-transparent"
            style={titleInputStyle}
          />
        </View>

        {/* Delete Button */}
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          enableDebounce={false}
          onPress={handleDelete}
          accessibilityLabel="Delete step"
        >
          <Trash2Icon className="text-destructive" size={18} strokeWidth={2.618} />
        </Button>
      </View>

      {/* Description Input - Aligned with title content */}
      <View className="flex-row gap-3">
        <View className="w-6" /> {/* Spacer to align with drag handle */}
        <View className="min-w-8" /> {/* Spacer to align with step badge */}
        <View className="flex-1 relative">
          <TextInput
            ref={descriptionInputRef}
            value={step.description}
            onChangeText={handleDescriptionChange}
            placeholder="Step description..."
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="flex-1 text-base text-muted-foreground font-urbanist-regular bg-transparent leading-relaxed"
            style={descriptionInputStyle}
          />
        </View>
      </View>
    </View>
  );
}
