import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { Pressable, StyleSheet, View } from "react-native";
import { ChefHatIcon } from "lucide-nativewind";
import { H4, P } from "~/components/ui/typography";

const CookedRecipeCard = ({
  recipeId,
  cookCount,
  lastCookedAt,
}: {
  recipeId: string;
  cookCount: number;
  lastCookedAt: number;
}) => {
  const router = useRouter();
  const { data: recipe } = useRecipe(recipeId);
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true, 24);

  const handlePress = () => {
    if (recipe) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/recipes/${recipe.id}`);
    }
  };

  if (!recipe) {
    return null; // Recipe not found in cache
  }

  return (
    <Animated.View
      className="flex-column items-start p-3"
      style={[animatedStyle]}
    >
      <Pressable
        onPress={handlePress}
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
          {/* Cook count badge */}
          {cookCount > 1 && (
            <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
              <ChefHatIcon size={12} className="text-foreground mr-1" />
              <P className="text-foreground text-xs font-urbanist-bold">
                {cookCount}x
              </P>
            </View>
          )}
        </Animated.View>
        <View className="mt-2">
          <H4 className="text-foreground/90 opacity-80 mb-1 font-urbanist-regular">
            {recipe.title}
          </H4>
          <P className="text-muted-foreground font-urbanist-medium text-sm">
            {formattedDate(lastCookedAt)}
          </P>
        </View>
      </Pressable>
    </Animated.View>
  );
};
export default CookedRecipeCard;

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});

// Format the last cooked date
const formattedDate = (lastCookedAt: number) => {
  const date = new Date(lastCookedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};
