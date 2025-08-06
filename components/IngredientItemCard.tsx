import { Pressable, StyleSheet, View, Platform } from "react-native";
import Animated from "react-native-reanimated";
import { AspectRatio } from "./ui/aspect-ratio";
import { H4, P } from "./ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import { useParallax } from "~/hooks/animation/useParallax";

const PARALLAX_CONFIG = { intensity: 1, maxOffset: 4 };

export const IngredientItemCard = ({ item }: { item: PantryItem }) => {
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  // Parallax effects for image container and image
  const containerParallax = useParallax(PARALLAX_CONFIG);
  const imageParallax = useParallax(PARALLAX_CONFIG);

  return (
    <Animated.View
      style={animatedStyle}
      className="flex-1 max-w-[50%] flex-column items-start p-3"
    >
      <Pressable
        onPress={() => router.push(`/${item.id}`)}
        onLongPress={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          sharedTransitionTag="pantry-item-image-container"
          style={containerParallax.animatedStyle}
        >
          <AspectRatio className="w-full relative rounded-2xl bg-muted flex items-center justify-center">
            <Animated.Image
              sharedTransitionTag="pantry-item-image"
              source={item.image_url}
              className="w-16 h-16"
              style={[styles.outlineImage, imageParallax.animatedStyle]}
              resizeMode="contain"
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
  outlineImage: {
    ...(Platform.OS === "ios" && {
      shadowColor: "#ffffff",
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    }),
    ...(Platform.OS === "android" && {
      elevation: 5,
    }),
  },
});
