import { ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { ReduceMotion, ZoomIn } from "react-native-reanimated";
import type { BlurViewProps } from "expo-blur";
import { XIcon } from "lucide-uniwind";
import BaseModal from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { H2, P } from "~/components/ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import useColors from "~/hooks/useColor";
import { titleCase } from "~/utils/text-formatter";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

interface RecipeIngredientsOverlayProps {
  visible: boolean;
  onClose: () => void;
  ingredients: RecipeIngredient[];
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;
  blurTarget?: BlurViewProps["blurTarget"];
}

export default function RecipeIngredientsOverlay({
  visible,
  onClose,
  ingredients,
  findMatch,
  blurTarget,
}: RecipeIngredientsOverlayProps) {
  const colors = useColors();
  const { height } = useWindowDimensions();

  return (
    <BaseModal modalVisible={visible} onCancel={onClose} blurTarget={blurTarget} blurTint="dark">
      {visible && (
        <Animated.View
          entering={ZoomIn.duration(180).reduceMotion(ReduceMotion.System)}
          className="w-full"
          style={{ maxHeight: height * 0.72 }}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View className="flex-row items-center justify-between px-4 mb-6">
            <H2 className="text-white font-bowlby-one tracking-wide">Ingredients</H2>
            <Button
              variant="ghost"
              size="icon"
              onPress={onClose}
              accessibilityLabel="Close ingredients"
            >
              <XIcon size={22} className="text-white" />
            </Button>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerClassName="flex-row flex-wrap px-3 pb-6"
          >
            {ingredients.map((ingredient, index) => {
              const image = findMatch(ingredient)?.image_url;
              return (
                <View
                  key={`${ingredient.relatedIngredientId}-${index}`}
                  className="basis-1/3 p-1 mb-5"
                >
                  <View className="w-16 h-16 items-center justify-center self-center">
                    {image ? (
                      <OutlinedImage source={image} size={56} strokeWidth={2.618} />
                    ) : (
                      <ShapeContainer
                        index={index}
                        width={64}
                        height={64}
                        text="?"
                        textClassname="text-3xl text-foreground/70 leading-[2]"
                        color={colors.border}
                      />
                    )}
                  </View>
                  <P className="text-white/80 text-sm font-urbanist-semibold text-center leading-tight mt-2">
                    {titleCase(ingredient.name)}
                  </P>
                  <P className="text-white text-xs tracking-wider font-urbanist-bold text-center mt-0.5">
                    {ingredient.quantity} {ingredient.unit}
                  </P>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </BaseModal>
  );
}
