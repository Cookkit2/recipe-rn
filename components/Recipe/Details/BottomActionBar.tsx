import React from "react";
import { View } from "react-native";
import { Button } from "~/components//ui/button";
import { H4 } from "~/components//ui/typography";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Recipe } from "~/types/Recipe";
import { storage } from "~/data";
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";
import { presentPaywallIfNeeded } from "~/utils/subscription-utils";
import { UtensilsCrossedIcon, Edit2Icon, HeartIcon } from "lucide-uniwind";
import TextShimmer from "~/components/ui/TextShimmer";

export type BottomActionBarProps = {
  recipe: Recipe;
  baseRecipeId: string;
  tailoredRecipeId?: string | null;
  mode: "original" | "tailored";
  hasTailored: boolean;
  canTailor: boolean;
  isTailoring: boolean;
  onTailor: () => void;
  onToggleMode: () => void;
  onEdit?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

const BottomActionBar = ({
  recipe,
  baseRecipeId,
  tailoredRecipeId,
  mode,
  hasTailored,
  canTailor,
  isTailoring,
  onTailor,
  onToggleMode,
  onEdit,
  isFavorite = false,
  onToggleFavorite,
}: BottomActionBarProps) => {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const isRecipeCooked = storage.get(RECIPE_COOKED_KEY) === true;

  const navigateToCookingSteps = async () => {
    const targetRecipeId = baseRecipeId || recipe.id;
    const targetTailoredId = tailoredRecipeId || "";
    const targetPath =
      mode === "tailored"
        ? {
            pathname: "/recipes/[recipeId]/steps" as const,
            params: {
              recipeId: targetRecipeId,
              tailored: "1",
              tailoredId: targetTailoredId,
            },
          }
        : {
            pathname: "/recipes/[recipeId]/steps" as const,
            params: { recipeId: targetRecipeId },
          };

    if (!isRecipeCooked) {
      router.push(targetPath);
      return;
    }

    // User have tried to cook a recipe
    // Present paywall if not subscribed
    const isPurchased = await presentPaywallIfNeeded();
    if (isPurchased) {
      router.push(targetPath);
    }
  };

  const showToggle = hasTailored;
  const toggleLabel = mode === "tailored" ? "View original" : "View tailored";
  const showTailor = canTailor && !hasTailored;
  const showEdit = onEdit !== undefined && mode === "original";
  const showFavorite = onToggleFavorite !== undefined;

  return (
    <View
      className="absolute left-0 right-0 pt-3 flex-row items-center justify-center gap-2"
      style={{ bottom: bottom + 8 }}
    >
      {showFavorite && (
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-4"
          onPress={onToggleFavorite}
          disabled={isTailoring}
        >
          <HeartIcon
            className={isFavorite ? "text-red-600" : "text-black"}
            size={16}
            strokeWidth={2.5}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </Button>
      )}
      {showEdit && (
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-4"
          onPress={onEdit}
          disabled={isTailoring}
        >
          <H4 className="font-urbanist-semibold">Edit</H4>
          <Edit2Icon className="text-foreground" size={16} strokeWidth={2.5} />
        </Button>
      )}
      {showTailor && (
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-5"
          onPress={onTailor}
          disabled={isTailoring}
        >
          <H4 className="font-urbanist-semibold">{isTailoring ? "Tailoring..." : "Tailor"}</H4>
        </Button>
      )}
      {showToggle && (
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-5"
          onPress={onToggleMode}
          disabled={isTailoring}
        >
          <H4 className="font-urbanist-semibold">{toggleLabel}</H4>
        </Button>
      )}
      <Button
        size="lg"
        className="rounded-2xl border-continuous bg-foreground"
        onPress={navigateToCookingSteps}
      >
        <TextShimmer className="flex-row items-center gap-2 justify-center">
          <UtensilsCrossedIcon className="text-background" size={18} strokeWidth={3} />
          <H4 className="font-urbanist-bold text-background">Cook</H4>
        </TextShimmer>
      </Button>
    </View>
  );
};

export default BottomActionBar;
