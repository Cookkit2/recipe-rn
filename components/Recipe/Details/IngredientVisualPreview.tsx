import { useState } from "react";
import { ScrollView } from "react-native";
import type { BlurViewProps } from "expo-blur";
import RotationCard from "~/components/Shared/RotationCard";
import { OutlinedImage } from "~/components/ui/outlined-image";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import type { IngredientPreviewData } from "~/utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import ScrollAwarePressable from "~/components/Shared/ScrollAwarePressable";
import RecipeIngredientsOverlay from "./RecipeIngredientsOverlay";

interface IngredientVisualPreviewProps {
  ingredientPreviewData: IngredientPreviewData;
  missingIngredientPalette: string[];
  ingredients: RecipeIngredient[];
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;
  blurTarget?: BlurViewProps["blurTarget"];
}

export default function IngredientVisualPreview({
  ingredientPreviewData,
  missingIngredientPalette,
  ingredients,
  findMatch,
  blurTarget,
}: IngredientVisualPreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const totalItems = ingredientPreviewData.matched.length + ingredientPreviewData.missing.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row mt-2 -mx-6 px-12 overflow-visible"
      >
        <ScrollAwarePressable
          className="flex-row py-2"
          accessibilityRole="button"
          accessibilityLabel="View recipe ingredients"
          accessibilityHint="Opens all ingredient images, names and quantities"
          onPress={() => setPreviewOpen(true)}
        >
          {/* Matched ingredients with images */}
          {ingredientPreviewData.matched.map((item, index) => (
            <RotationCard
              key={`matched-${item.name}-${index}`}
              index={index}
              total={totalItems}
              className="-ml-6"
              style={{ zIndex: index }}
              scaleEnabled={false}
            >
              <OutlinedImage source={item.imageUrl} size={48} />
            </RotationCard>
          ))}
          {/* Missing ingredients with shape placeholders */}
          {ingredientPreviewData.missing.map((item, index) => (
            <RotationCard
              key={`missing-${item.name}-${index}`}
              index={ingredientPreviewData.matched.length + index}
              total={totalItems}
              className="-ml-6"
              style={{ zIndex: ingredientPreviewData.matched.length + index }}
              scaleEnabled={false}
            >
              <ShapeContainer
                index={item.index % 21}
                text="?"
                width={48}
                height={48}
                color={missingIngredientPalette[index % 6]}
              />
            </RotationCard>
          ))}
        </ScrollAwarePressable>
      </ScrollView>
      <RecipeIngredientsOverlay
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        ingredients={ingredients}
        findMatch={findMatch}
        blurTarget={blurTarget}
      />
    </>
  );
}
