import React, { startTransition } from "react";
import {
  DicesIcon,
  IceCreamConeIcon,
  MartiniIcon,
  SoupIcon,
  XIcon,
} from "lucide-nativewind";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { ScrollView } from "react-native";
import { usePantryStore } from "~/store/PantryContext";
import { useRecipeStore } from "~/store/RecipeContext";
import { useLightColors } from "~/hooks/useColor";
import { useRandomRecipeRecommendation } from "~/hooks/queries/useRecipeQueries";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

const RECIPE_TAGS: {
  label: string;
  icon: React.JSX.Element;
  tag: string;
}[] = [
  {
    label: "Meal",
    icon: <SoupIcon size={18} strokeWidth={3} />,
    tag: "meal",
  },
  {
    label: "Dessert",
    icon: <IceCreamConeIcon size={18} strokeWidth={3} />,
    tag: "dessert",
  },
  {
    label: "Drink",
    icon: <MartiniIcon size={18} strokeWidth={3} />,
    tag: "drink",
  },
];

export default function RecipeCategoryButtonGroup() {
  const { updateRecipeOpen: updateSelection } = usePantryStore();
  const { selectedRecipeTags } = useRecipeStore();
  const lightColors = useLightColors();
  const router = useRouter();

  // Hook for getting random recipe recommendations
  const { getRandomRecipe, hasRecipes, isLoading } =
    useRandomRecipeRecommendation({
      categories:
        selectedRecipeTags.length > 0 ? selectedRecipeTags : undefined,
      maxRecommendations: 20,
      respectDietaryPreferences: true,
    });

  const handleChooseForMe = () => {
    if (isLoading) {
      toast.warning("Loading recipes, please wait...");
      return;
    }

    if (!hasRecipes) {
      toast.warning("No recipes available. Try adding more ingredients!");
      return;
    }

    const randomRecipe = getRandomRecipe();
    if (randomRecipe) {
      // Close the recipe selection panel
      updateSelection(false);
      // Navigate to the random recipe
      router.push(`/recipes/${randomRecipe.id}`);
    } else {
      toast.error("Something went wrong finding a recipe. Please try again.");
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-3 px-6"
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-12 w-12"
        onPress={() => updateSelection(false)}
      >
        <XIcon className="text-white/80" />
      </Button>
      <Button
        variant="outline"
        className="rounded-2xl border-continuous flex-row items-center gap-2 border-white/20"
        onPress={handleChooseForMe}
        disabled={isLoading || !hasRecipes}
      >
        <DicesIcon color={lightColors.background} size={18} strokeWidth={3} />
        <P
          className="text-lg font-urbanist-semibold leading-snug"
          style={{
            color: lightColors.background,
          }}
        >
          {isLoading ? "Loading..." : "Choose for me!"}
        </P>
      </Button>
      {RECIPE_TAGS.map(({ label, icon, tag }) => (
        <SegmentedButton key={tag} label={label} icon={icon} tag={tag} />
      ))}
    </ScrollView>
  );
}

const SegmentedButton = ({
  label,
  icon,
  tag,
}: {
  label: string;
  icon: React.JSX.Element;
  tag: string;
}) => {
  const { snapToExpanded } = usePantryStore();
  const { selectedRecipeTags, updateRecipeTag } = useRecipeStore();
  const lightColors = useLightColors();

  return (
    <Button
      variant="default"
      className={"rounded-2xl border-continuous flex-row gap-2 items-center"}
      style={{
        backgroundColor: selectedRecipeTags.includes(tag)
          ? lightColors.primary
          : lightColors.mutedForeground,
      }}
      onPress={() => {
        updateRecipeTag(tag);
        startTransition(() => snapToExpanded());
      }}
    >
      {React.cloneElement(icon, {
        style: {
          color: selectedRecipeTags.includes(tag)
            ? lightColors.primaryForeground
            : lightColors.background,
        },
      })}
      <P
        className={"text-lg font-urbanist-semibold leading-snug"}
        style={{
          color: selectedRecipeTags.includes(tag)
            ? lightColors.primaryForeground
            : lightColors.background,
        }}
      >
        {label}
      </P>
    </Button>
  );
};
