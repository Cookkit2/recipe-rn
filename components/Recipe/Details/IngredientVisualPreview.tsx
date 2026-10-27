import { useCallback, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedRef,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import type { BlurViewProps } from "expo-blur";
import type { IngredientPreviewData } from "~/utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import ScrollAwarePressable from "~/components/Shared/ScrollAwarePressable";
import RecipeIngredientsOverlay from "./RecipeIngredientsOverlay";
import { INGREDIENT_STRIP_HEIGHT, type IngredientSourceFrame } from "./ingredient-preview-layout";

interface IngredientVisualPreviewProps {
  ingredientPreviewData: IngredientPreviewData;
  missingIngredientPalette: string[];
  ingredients: RecipeIngredient[];
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;
  blurTarget?: BlurViewProps["blurTarget"];
  scrollOffset?: SharedValue<number>;
  portalHostName?: string;
}

export default function IngredientVisualPreview({
  ingredientPreviewData,
  missingIngredientPalette,
  ingredients,
  findMatch,
  blurTarget,
  scrollOffset,
  portalHostName,
}: IngredientVisualPreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const sourceRef = useAnimatedRef<View>();
  const sourceFrame = useSharedValue<IngredientSourceFrame>({ x: 0, y: 0, width: 0, height: 0 });
  const sourceScrollOffset = useSharedValue(0);
  const measureSource = useCallback(() => {
    sourceRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) {
        sourceScrollOffset.value = scrollOffset?.value ?? 0;
        sourceFrame.value = { x, y, width, height };
      }
    });
  }, [sourceFrame, sourceRef, sourceScrollOffset, scrollOffset]);
  const close = useCallback(() => setPreviewOpen(false), []);

  if (!ingredients.length) return null;

  return (
    <>
      <Animated.View
        ref={sourceRef}
        testID="recipe-ingredient-source"
        collapsable={false}
        onLayout={measureSource}
        style={{ height: INGREDIENT_STRIP_HEIGHT, marginTop: 8 }}
      >
        <ScrollAwarePressable
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel="View recipe ingredients"
          accessibilityHint="Opens all ingredient images, names and quantities"
          onPress={() => {
            measureSource();
            setPreviewOpen(true);
          }}
        />
      </Animated.View>
      <RecipeIngredientsOverlay
        visible={previewOpen}
        onClose={close}
        ingredients={ingredients}
        ingredientPreviewData={ingredientPreviewData}
        missingIngredientPalette={missingIngredientPalette}
        findMatch={findMatch}
        blurTarget={blurTarget}
        sourceFrame={sourceFrame}
        sourceScrollOffset={sourceScrollOffset}
        parentScrollOffset={scrollOffset}
        portalHostName={portalHostName}
      />
    </>
  );
}
