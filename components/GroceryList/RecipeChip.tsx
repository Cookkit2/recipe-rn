import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { CheckCircleIcon, CircleIcon } from "lucide-uniwind";
import { P } from "~/components/ui/typography";
import { Link, useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import type { Recipe } from "~/types/Recipe";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RecipeChipProps {
  recipe: {
    id: string;
    title: string;
    imageUrl: string;
  };
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleRecipe?: (id: string) => void;
}

export default function RecipeChip({
  recipe,
  isSelectionMode,
  isSelected,
  onToggleRecipe,
}: RecipeChipProps) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true, 16);

  return (
    <Link asChild href={`/recipes/${recipe.id}`}>
      <Pressable className="w-24" onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View
          className="w-24 h-24 overflow-hidden mb-2 shadow-sm bg-card border border-border/10 relative"
          style={[roundedStyle, animatedStyle]}
        >
          <Link.AppleZoom>
            <Image
              source={{ uri: recipe.imageUrl }}
              style={{ width: "100%", height: "100%", opacity: isSelectionMode ? 0.7 : 1 }}
              collapsable={false}
            />
          </Link.AppleZoom>
          {isSelectionMode && (
            <View className="absolute inset-0 items-center justify-center bg-black/10">
              {isSelected ? (
                <CheckCircleIcon
                  className="text-primary bg-background rounded-full"
                  size={32}
                  strokeWidth={2}
                />
              ) : (
                <CircleIcon className="text-white" size={32} strokeWidth={2} />
              )}
            </View>
          )}
        </Animated.View>
        <P
          className="text-[10px] text-center font-urbanist-semibold leading-tight"
          numberOfLines={2}
        >
          {recipe.title}
        </P>
      </Pressable>
    </Link>
  );
}
