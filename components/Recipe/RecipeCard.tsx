import React from "react";
import { View, Image } from "react-native";
import { MotiView } from "moti";
import { Card, CardContent } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import type { Recipe } from "~/data/dummy-recipes";

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
}

export default function RecipeCard({ recipe, index }: RecipeCardProps) {
  const delay = index * 100; // Staggered animation delay based on index
  return (
    <MotiView
      from={{
        scale: 0,
        opacity: 0,
      }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      exit={{
        scale: 0,
        opacity: 0,
      }}
      transition={{
        type: "spring",
        stiffness: 250,
        damping: 18,
        mass: 0.3,
        opacity: {
          type: "timing",
          duration: 200,
        },
        delay,
      }}
      exitTransition={{
        type: "spring",
        stiffness: 250,
        damping: 18,
        mass: 0.3,
        delay,
      }}
    >
      <Card className="bg-white shadow-xl rounded-lg">
        <CardContent className="p-0">
          {recipe.imageUrl && (
            <Image
              source={{ uri: recipe.imageUrl }}
              className="w-full h-48 rounded-t-lg"
              resizeMode="cover"
            />
          )}
          <View className="p-4">
            <Text className="text-xl font-bold text-gray-800 mb-2 leading-6">
              {recipe.title}
            </Text>
            {(recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) > 0 && (
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-600">
                  🕒 {(recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)} min
                </Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    </MotiView>
  );
}
