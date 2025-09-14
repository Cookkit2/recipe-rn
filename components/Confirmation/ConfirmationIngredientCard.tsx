import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import useColors from "~/hooks/useColor";
import useDebounce from "~/hooks/useDebounce";
import useImageColors from "~/hooks/useImageColors";
import OutlinedImage from "../ui/outlined-image";
import { H4, P } from "../ui/typography";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { type PantryItemConfirmation } from "~/types/PantryItem";

export default function ConfirmationIngredientCard({
  item,
}: {
  item: PantryItemConfirmation;
}) {
  const { id, image_url, name, quantity, unit } = item;
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true, 24);

  const color = useImageColors(image_url);
  const colors = useColors();
  const router = useRouter();

  const debouncedPress = useDebounce(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/ingredient/confirmation/${id}`);
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="flex-1 max-w-[50%] flex-column items-start p-3"
    >
      <Pressable
        onPress={debouncedPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          className="w-full relative rounded-3xl flex items-center justify-center border-continuous aspect-square"
          style={[{ backgroundColor: color || colors.muted }, roundedStyle]}
        >
          <OutlinedImage source={image_url} size={64} />
        </Animated.View>
        <View className="mt-2">
          <H4 className="opacity-80 mb-[0.5] font-urbanist-bold">{name}</H4>
          <P className="text-muted-foreground font-urbanist-medium">
            {quantity} {unit}
          </P>
        </View>
      </Pressable>
    </Animated.View>
  );
}
