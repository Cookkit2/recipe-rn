import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { H4, P } from "~/components/ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { Link } from "expo-router";
import OutlinedImage from "~/components/ui/outlined-image";
import * as Haptics from "expo-haptics";
import useColors from "~/hooks/useColor";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { usePantryStore } from "~/store/PantryContext";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { memo } from "react";

const IngredientItemCard = ({ item, index }: { item: PantryItem; index: number }) => {
  const colors = useColors();

  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true, 24);
  const { isRecipeOpen, updateRecipeOpen } = usePantryStore();

  const debouncedPress = () => {
    if (isRecipeOpen) {
      updateRecipeOpen(false);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={[animatedStyle]} className="p-3 max-w-[50%]">
      <Link href={`/ingredient/${item.id}`} asChild>
        <Pressable
          onPress={debouncedPress}
          onPressIn={() => {
            if (onPressIn && !isRecipeOpen) {
              onPressIn();
            }
          }}
          onPressOut={() => {
            if (onPressOut && !isRecipeOpen) {
              onPressOut();
            }
          }}
        >
          <Animated.View
            className="w-full relative rounded-3xl flex items-center justify-center border-continuous aspect-square"
            style={[{ backgroundColor: item.background_color || colors.muted }, roundedStyle]}
          >
            <Link.AppleZoom>
              <View collapsable={false}>
                {item.image_url ? (
                  <OutlinedImage source={item.image_url} size={64} />
                ) : (
                  <ShapeContainer
                    index={index}
                    width={64}
                    height={64}
                    text="?"
                    textClassname="text-3xl text-foreground/70 leading-[2]"
                    color={colors.border}
                    collapsable={false}
                  />
                )}
              </View>
            </Link.AppleZoom>
          </Animated.View>
          <View className="mt-2">
            <H4 className="opacity-80 mb-[0.5] font-urbanist-regular">{item.name}</H4>
            <P className="text-muted-foreground font-urbanist-medium">
              {item.quantity} {item.unit}
            </P>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
};

export default memo(IngredientItemCard, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.unit === nextProps.item.unit &&
    prevProps.item.image_url === nextProps.item.image_url &&
    prevProps.item.background_color === nextProps.item.background_color &&
    prevProps.index === nextProps.index
  );
});
