import React, { useRef, useState } from "react";
import { View, Pressable, TextInput, Alert } from "react-native";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { Trash2Icon } from "lucide-uniwind";
import { cn } from "~/lib/utils";
import { UNIT_OPTIONS } from "~/constants/ingredient-units";
import { storage } from "~/data";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import type { RecipeIngredient } from "~/types/Recipe";

type EditIngredientItemProps = {
  ingredient: RecipeIngredient;
  onChange: (ingredient: RecipeIngredient) => void;
  onDelete: () => void;
  className?: string;
};

export default function EditIngredientItem({
  ingredient,
  onChange,
  onDelete,
  className,
}: EditIngredientItemProps) {
  const [nameHeight, setNameHeight] = useState<number | undefined>(undefined);
  const nameInputRef = useRef<TextInput>(null);

  // Handle legacy "si" value - treat as "metric"
  const storedValue = storage.get(PREF_UNIT_SYSTEM_KEY) as string | undefined;
  const currentUnit = storedValue === "imperial" ? "imperial" : "metric";

  const nameInputStyle = React.useMemo(
    () => ({
      height: nameHeight,
      paddingVertical: 0,
      includeFontPadding: false,
    }),
    [nameHeight]
  );

  const showUnitPicker = () => {
    const buttons = [
      ...UNIT_OPTIONS[currentUnit].map((option) => ({
        text: option.label,
        onPress: () => handleUnitChange(option.value),
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Select Unit", undefined, buttons);
  };

  const handleNameChange = (newName: string) => {
    onChange({ ...ingredient, name: newName });
  };

  const handleQuantityChange = (newQuantity: string) => {
    const parsed = parseFloat(newQuantity);
    const quantity = isNaN(parsed) ? 0 : Math.max(0, Math.min(9999, parsed));
    onChange({ ...ingredient, quantity });
  };

  const handleUnitChange = (newUnit: string) => {
    onChange({ ...ingredient, unit: newUnit });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Ingredient",
      `Are you sure you want to remove "${ingredient.name}" from the recipe?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <View
      className={cn(
        "flex-row items-center gap-3 py-3 px-4 bg-card rounded-xl border-continuous",
        className
      )}
    >
      {/* Quantity Input */}
      <View className="w-20">
        <Input
          value={ingredient.quantity.toString()}
          onChangeText={handleQuantityChange}
          keyboardType="decimal-pad"
          className="text-center text-foreground"
          maxLength={4}
        />
      </View>

      {/* Unit Picker */}
      <Pressable
        onPress={showUnitPicker}
        className="min-w-12 h-10 flex items-center justify-center bg-muted rounded-lg border-continuous"
      >
        <P className="text-center font-urbanist-medium text-base">{ingredient.unit}</P>
      </Pressable>

      {/* Name Input - Uses EditableTitle pattern */}
      <View className="flex-1">
        <View className="relative">
          <TextInput
            ref={nameInputRef}
            value={ingredient.name}
            onChangeText={handleNameChange}
            placeholder="Ingredient name"
            multiline={false}
            scrollEnabled={false}
            textAlignVertical="center"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="flex-1 text-base text-foreground font-urbanist-semibold bg-transparent"
            style={nameInputStyle}
          />
        </View>
      </View>

      {/* Delete Button */}
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={handleDelete}
        accessibilityLabel="Delete ingredient"
      >
        <Trash2Icon className="text-destructive" size={18} strokeWidth={2.618} />
      </Button>
    </View>
  );
}
