import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AspectRatio } from "./ui/aspect-ratio";
import { H4, P } from "./ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";

export const IngredientItemCard = ({ item }: { item: PantryItem }) => {
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

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
        <Animated.View sharedTransitionTag="pantry-item-image-container">
          <AspectRatio className="w-full relative rounded-2xl bg-muted flex items-center justify-center">
            <Animated.Image
              sharedTransitionTag="pantry-item-image"
              source={item.image_url}
              className="w-16 h-16"
              style={styles.outlineImage}
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
    shadowColor: "white",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5, // For Android
  },
});
