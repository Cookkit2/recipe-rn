import React from "react";
import { View, Pressable, Image } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { H3, H4, P } from "~/components/ui/typography";
import { Text } from "~/components/ui/text";
import {
  CheckCircleIcon,
  XCircleIcon,
  ChefHatIcon,
  ClockIcon,
  ShoppingCartIcon,
  AlertCircleIcon,
  SparklesIcon,
} from "lucide-uniwind";
import type { YouTubeImportResult } from "~/types/ScrappedRecipe";

interface ImportResultCardProps {
  data?: YouTubeImportResult | null;
  error?: Error | null;
  onViewRecipe: () => void;
  onTryAgain: () => void;
}

export default function ImportResultCard({
  data,
  error,
  onViewRecipe,
  onTryAgain,
}: ImportResultCardProps) {
  const isSuccess = data?.success && data.recipe;
  const errorMessage = data?.error || error?.message;

  if (isSuccess && data.recipe) {
    return (
      <Animated.View entering={FadeIn.delay(200)}>
        {/* Success Header */}
        <View className="items-center mb-6">
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <View className="w-20 h-20 rounded-full bg-green-500/20 items-center justify-center mb-3">
              <CheckCircleIcon className="text-green-500" size={48} />
            </View>
          </Animated.View>
          <H3 className="text-foreground text-center mb-1">Recipe Imported!</H3>
          <P className="text-muted-foreground text-center">Your recipe is ready to cook</P>
        </View>

        {/* Recipe Preview Card */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          className="bg-card rounded-2xl border border-border overflow-hidden mb-4"
        >
          {/* Recipe Image */}
          {data.recipe.imageUrl && (
            <View className="relative">
              <Image
                source={{ uri: data.recipe.imageUrl }}
                className="w-full h-48"
                resizeMode="cover"
              />
              <View className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 rounded-full flex-row items-center">
                <SparklesIcon className="text-yellow-400 mr-1" size={14} />
                <Text className="text-white text-xs font-semibold">AI Generated</Text>
              </View>
            </View>
          )}

          <View className="p-4">
            {/* Recipe Title */}
            <H4 className="text-foreground mb-2">{data.recipe.title}</H4>

            {/* Recipe Info */}
            <View className="flex-row flex-wrap gap-3 mb-3">
              <View className="flex-row items-center">
                <ClockIcon className="text-muted-foreground mr-1" size={16} />
                <Text className="text-muted-foreground text-sm">
                  {(data.recipe.prepMinutes || 0) + (data.recipe.cookMinutes || 0)} min
                </Text>
              </View>
              <View className="flex-row items-center">
                <ChefHatIcon className="text-muted-foreground mr-1" size={16} />
                <Text className="text-muted-foreground text-sm">
                  {data.recipe.servings || 2} servings
                </Text>
              </View>
              {data.recipe.difficultyStars && (
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground text-sm">
                    {"⭐".repeat(data.recipe.difficultyStars)}
                  </Text>
                </View>
              )}
            </View>

            {/* Shopping List Info */}
            {data.shoppingList && (
              <View className="p-3 bg-muted/50 rounded-xl">
                <View className="flex-row items-start">
                  <ShoppingCartIcon className="text-primary mr-2 mt-0.5" size={18} />
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold mb-1">Shopping List Ready</Text>
                    <Text className="text-muted-foreground text-sm">
                      {data.shoppingList.missingIngredients.length > 0
                        ? `${data.shoppingList.missingIngredients.length} ingredient${data.shoppingList.missingIngredients.length !== 1 ? "s" : ""} needed`
                        : "All ingredients available!"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(500).springify()} className="space-y-3">
          <Pressable
            className="bg-primary active:bg-primary/90 py-4 rounded-xl items-center justify-center"
            onPress={onViewRecipe}
          >
            <Text className="text-primary-foreground font-bold text-lg">View Recipe</Text>
          </Pressable>

          <Pressable
            className="bg-muted active:bg-muted/70 py-3 rounded-xl items-center justify-center"
            onPress={onTryAgain}
          >
            <Text className="text-foreground font-medium">Import Another Recipe</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  // Error State
  return (
    <Animated.View entering={FadeIn.delay(200)}>
      {/* Error Header */}
      <View className="items-center mb-6">
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View className="w-20 h-20 rounded-full bg-destructive/20 items-center justify-center mb-3">
            <XCircleIcon className="text-destructive" size={48} />
          </View>
        </Animated.View>
        <H3 className="text-foreground text-center mb-1">Import Failed</H3>
        <P className="text-muted-foreground text-center">We couldn't import this recipe</P>
      </View>

      {/* Error Details */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6"
      >
        <View className="flex-row items-start">
          <AlertCircleIcon className="text-destructive mr-2 mt-0.5" size={20} />
          <View className="flex-1">
            <Text className="text-destructive font-semibold mb-1">Error Details</Text>
            <Text className="text-destructive/80 text-sm">
              {errorMessage || "An unknown error occurred"}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Troubleshooting Tips */}
      <Animated.View
        entering={FadeInDown.delay(500).springify()}
        className="bg-muted/50 rounded-xl p-4 mb-6"
      >
        <H4 className="text-foreground mb-2">💡 Troubleshooting Tips</H4>
        <View className="space-y-2">
          <View className="flex-row items-start">
            <Text className="text-muted-foreground mr-2">•</Text>
            <Text className="text-muted-foreground text-sm flex-1">
              Make sure the video is a cooking tutorial
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-muted-foreground mr-2">•</Text>
            <Text className="text-muted-foreground text-sm flex-1">
              Video should have clear ingredients and steps
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-muted-foreground mr-2">•</Text>
            <Text className="text-muted-foreground text-sm flex-1">
              Try a different video if the recipe is unclear
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-muted-foreground mr-2">•</Text>
            <Text className="text-muted-foreground text-sm flex-1">
              Check your internet connection
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Try Again Button */}
      <Animated.View entering={FadeInDown.delay(600).springify()}>
        <Pressable
          className="bg-primary active:bg-primary/90 py-4 rounded-xl items-center justify-center"
          onPress={onTryAgain}
        >
          <Text className="text-primary-foreground font-bold text-lg">Try Another URL</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
