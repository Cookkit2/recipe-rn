import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { AspectRatio } from "../ui/aspect-ratio";
import { H4, P } from "../ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import { useParallax } from "~/hooks/animation/useParallax";
import OutlinedImage from "../ui/outlined-image";

const PARALLAX_CONFIG = { intensity: 1, maxOffset: 4 };

export const IngredientItemCard = ({
  item,
  index,
}: {
  item: PantryItem;
  index: number;
}) => {
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  // Parallax effects for image container and image
  const containerParallax = useParallax(PARALLAX_CONFIG);
  const imageParallax = useParallax(PARALLAX_CONFIG);

  return (
    <Animated.View
      style={[animatedStyle]}
      className="flex-1 max-w-[50%] flex-column items-start p-3"
    >
      <Pressable
        onPress={() => router.push(`/${item.id}`)}
        onLongPress={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          sharedTransitionTag="pantry-item-image-container"
          style={[containerParallax.animatedStyle]}
        >
          <AspectRatio
            className="w-full relative rounded-3xl bg-muted flex items-center justify-center"
            style={styles.container}
          >
            <OutlinedImage
              source={item.image_url}
              size={64}
              style={[imageParallax.animatedStyle]}
            />
          </AspectRatio>
        </Animated.View>
        <View className="mt-2">
          <H4 className="opacity-80 mb-[0.5]">{item.name}</H4>
          <P className="text-muted-foreground">{item.quantity}</P>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderCurve: "continuous",
  },
});
