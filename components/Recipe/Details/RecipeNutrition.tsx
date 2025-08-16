import React from "react";
import { View } from "react-native";
import { P } from "../../ui/typography";
import {
  AppleIcon,
  DrumstickIcon,
  FlameIcon,
  WheatIcon,
} from "lucide-nativewind";
import type { Recipe } from "~/types/Recipe";

export default function RecipeNutrition({ recipe }: { recipe: Recipe }) {
  const nutritionItems = [
    {
      icon: <AppleIcon className="text-muted-foreground" size={28} />,
      title: "Carbs",
      description: "Rich in carbohydrates from flour and sugar",
    },
    {
      icon: <DrumstickIcon className="text-muted-foreground" size={28} />,
      title: "Protein",
      description: "Moderate protein from eggs and nuts",
    },

    {
      icon: <FlameIcon className="text-muted-foreground" size={28} />,
      title: "Calories",
      description: `Approx. ${recipe.calories ?? 0} kcal per serving`,
    },

    {
      icon: <WheatIcon className="text-muted-foreground" size={22} />,
      title: "Allergens",
      description: "Contains gluten, eggs, and may contain nuts",
    },
  ];
  return (
    <View className="gap-5">
      {nutritionItems.map((item) => (
        <NutritionItem key={item.title} {...item} />
      ))}
    </View>
  );
}

const NutritionItem = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <View className="flex-row gap-4">
      {icon}
      <View className="flex-1">
        <P className="text-foreground font-semibold">{title}</P>
        <P className="text-muted-foreground">{description} per serving</P>
      </View>
    </View>
  );
};
