import { ScrollView } from "react-native";
import RotationCard from "~/components/Shared/RotationCard";
import { OutlinedImage } from "~/components/ui/outlined-image";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";

interface IngredientPreviewData {
  matched: { name: string; imageUrl: string; quantity: number; unit: string }[];
  missing: { name: string; index: number; quantity: number; unit: string }[];
}

interface IngredientVisualPreviewProps {
  ingredientPreviewData: IngredientPreviewData;
  missingIngredientPalette: string[];
}

export default function IngredientVisualPreview({
  ingredientPreviewData,
  missingIngredientPalette,
}: IngredientVisualPreviewProps) {
  const totalItems = ingredientPreviewData.matched.length + ingredientPreviewData.missing.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row gap-2 mt-2 -mx-6 px-12 overflow-visible"
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
    </ScrollView>
  );
}
