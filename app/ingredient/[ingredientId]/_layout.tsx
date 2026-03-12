import React from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { IngredientDetailProvider } from "~/store/IngredientDetailContext";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { H1, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";

export default function IngredientDetailLayout() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const router = useRouter();

  const { data: filteredPantryItems = [], isLoading, error } = usePantryItemsByType("all");

  const item = filteredPantryItems.find((item) => item.id === ingredientId);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <ActivityIndicator size="large" />
        <P className="mt-1 text-muted-foreground">Loading ingredient...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <H1 className="text-center font-urbanist-black">Ingredient not found</H1>
        <P className="mt-2 text-muted-foreground text-center font-urbanist">
          The ingredient you're looking for doesn't exist.
        </P>
        <Button variant="ghost" className="mt-6" onPress={() => router.back()}>
          <P className="text-center font-urbanist">Go Back</P>
        </Button>
      </View>
    );
  }

  return (
    <IngredientDetailProvider item={item}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
      </Stack>
    </IngredientDetailProvider>
  );
}
