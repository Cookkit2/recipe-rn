import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { AspectRatio } from "../ui/aspect-ratio";
import { H4, P } from "../ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import { useParallax } from "~/hooks/animation/useParallax";
import OutlinedImage from "../ui/outlined-image";
import { PARALLAX_CONFIG } from "~/constants/parallax";
import useDebounce from "~/hooks/useDebounce";
import * as Haptics from "expo-haptics";
import useImageColors from "~/hooks/useImageColors";
import useColors from "~/hooks/useColor";

export const IngredientItemCard = ({ item }: { item: PantryItem }) => {
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  const color = useImageColors(item.image_url);
  const colors = useColors();

  const containerParallax = useParallax(PARALLAX_CONFIG);
  const imageParallax = useParallax(PARALLAX_CONFIG);

  const debouncedPress = useDebounce(() => {
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
        onLongPress={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          sharedTransitionTag="pantry-item-image-container"
          style={[containerParallax.animatedStyle]}
        >
          <AspectRatio
            className="w-full relative rounded-3xl flex items-center justify-center border-continuous"
            style={{ backgroundColor: color || colors.muted }}
          >
            <OutlinedImage
              source={item.image_url}
              size={64}
              style={[imageParallax.animatedStyle]}
            />
          </AspectRatio>
        </Animated.View>
        <View className="mt-2">
          <H4 className="opacity-80 mb-[0.5] font-urbanist-regular">
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
