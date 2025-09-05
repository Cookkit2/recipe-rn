import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { H4, P } from "../ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import OutlinedImage from "../ui/outlined-image";
import useDebounce from "~/hooks/useDebounce";
import * as Haptics from "expo-haptics";
import useImageColors from "~/hooks/useImageColors";
import useColors from "~/hooks/useColor";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { usePantryStore } from "~/store/PantryContext";
import ShapeContainer from "../Shared/Shapes/ShapeContainer";

export const IngredientItemCard = ({
  item,
  index,
}: {
  item: PantryItem;
  index: number;
}) => {
  const router = useRouter();
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true, 24);
  const { isRecipeOpen, updateRecipeOpen } = usePantryStore();

  const color = useImageColors(item.image_url);
  const colors = useColors();

  const debouncedPress = useDebounce(() => {
    if (isRecipeOpen) {
      updateRecipeOpen(false);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/${item.id}`);
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="flex-1 max-w-[50%] flex-column items-start p-3"
    >
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
          style={[{ backgroundColor: color || colors.muted }, roundedStyle]}
        >
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
            />
          )}
        </Animated.View>
        <View className="mt-2">
          <H4 className="opacity-80 mb-[0.5] font-urbanist-bold">
            {item.name}
          </H4>
          <P className="text-muted-foreground font-urbanist-medium">
            {item.quantity}
          </P>
        </View>
      </Pressable>
    </Animated.View>
  );
};
