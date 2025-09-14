import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { H4, P } from "../ui/typography";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { Recipe } from "~/types/Recipe";
import { StarIcon } from "lucide-nativewind";
import useDebounce from "~/hooks/useDebounce";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";

const RecipeItemCard = ({ recipe }: { recipe: Recipe }) => {
  const router = useRouter();
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true, 24);

  const debouncedPress = useDebounce(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/${recipe.id}`);
  });

  return (
    <Animated.View
      key={recipe.id}
      className="flex-1 max-w-[50%] flex-column items-start p-3"
      style={[animatedStyle]}
    >
      <Pressable
        onPress={debouncedPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          className="w-full relative flex items-center justify-center border-continuous aspect-square overflow-hidden"
          style={[roundedStyle]}
        >
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        </Animated.View>
        <View className="mt-2">
          <H4 className="text-white/90 opacity-80 mb-[0.5] font-urbanist-regular">
            {recipe.title}
          </H4>
          <View className="flex-row items-center">
            <P className="text-muted-foreground font-urbanist-medium">
              {(recipe.cookMinutes ?? 0) + (recipe.prepMinutes ?? 0)} min
            </P>
            <View className="flex-1" />
            <P className="text-muted-foreground font-urbanist-medium">
              {recipe.difficultyStars}{" "}
            </P>
            <StarIcon size={14} className="text-yellow-400" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default RecipeItemCard;

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
