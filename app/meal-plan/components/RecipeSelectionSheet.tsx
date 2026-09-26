import React from "react";
import { View, Pressable, ActivityIndicator, FlatList } from "react-native";
import { H3, P } from "~/components/ui/typography";
import RecipeDraggable from "~/components/MealPlanCalendar/RecipeDraggable";
import type { Recipe } from "~/types/Recipe";

interface RecipeSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  recipes: Recipe[];
}

export function RecipeSelectionSheet({
  isOpen,
  onClose,
  isLoading,
  recipes,
}: RecipeSelectionSheetProps) {
  if (!isOpen) return null;

  return (
    <View className="absolute inset-x-0 bottom-0 top-0 bg-background/80">
      <View className="absolute bottom-0 left-0 right-0 max-h-[70%] bg-background rounded-t-3xl border-t border-border/20 shadow-2xl">
        {/* Handle Bar */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-3 border-b border-border/10">
          <H3 className="font-bowlby-one">Select Recipe</H3>
          <Pressable
            onPress={onClose}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Close recipe selection"
          >
            <P className="text-muted-foreground font-urbanist-semibold">Done</P>
          </Pressable>
        </View>

        {/* Recipe List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" />
            <P className="mt-4 text-muted-foreground">Loading recipes...</P>
          </View>
        ) : recipes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12 px-6">
            <P className="text-muted-foreground text-center">No recipes available.</P>
          </View>
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="mb-3">
                <RecipeDraggable recipe={item} servings={4} />
              </View>
            )}
            className="flex-1 px-4 pt-4 pb-8"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </View>
  );
}
