import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { H1, P } from "~/components/ui/typography";
import IngredientView from "~/components/Ingredient/IngredientView";
import SheetModalWrapper from "~/components/SheetModal/SheetModalWrapper";
import type { PantryItem } from "~/types/PantryItem";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const {
    data: filteredPantryItems = [],
    isLoading,
    error,
  } = usePantryItemsByType("all");

  const item = useMemo(() => {
    return filteredPantryItems.find((item) => item.id === ingredientId);
  }, [filteredPantryItems, ingredientId]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" />
        <P className="mt-1 text-muted-foreground">Loading ingredient...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
        <P className="mt-2 text-muted-foreground text-center">
          The ingredient you're looking for doesn't exist.
        </P>
      </View>
    );
  }

  if (Platform.OS === "ios") {
    return <WithSheetModal item={item} />;
  }

  // Default to non-sheet modal page
  return <DefaultIngredientView item={item} />;
}

const DefaultIngredientView = ({ item }: { item: PantryItem }) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const ScrollComponent = (
    props: React.ComponentProps<typeof Animated.ScrollView>
  ) => <Animated.ScrollView {...props} ref={scrollRef} />;

  return (
    <IngredientView
      ScrollComponent={ScrollComponent}
      scrollRef={scrollRef}
      ingredient={item}
    />
  );
};

const WithSheetModal = ({ item }: { item: PantryItem }) => {
  return (
    <SheetModalWrapper>
      {({ ScrollComponent, scrollRef }) => {
        return (
          <IngredientView
            ScrollComponent={ScrollComponent}
            scrollRef={scrollRef}
            ingredient={item}
          />
        );
      }}
    </SheetModalWrapper>
  );
};
