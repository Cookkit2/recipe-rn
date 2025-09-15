import React, { useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { H1, P } from "~/components/ui/typography";
import IngredientView from "~/components/Ingredient/IngredientView";
import SheetModalWrapper from "~/components/SheetModal/SheetModalWrapper";
import type { PantryItem } from "~/types/PantryItem";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { Button } from "~/components/ui/button";
import { SystemBars } from "react-native-edge-to-edge";

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const router = useRouter();
  const {
    data: filteredPantryItems = [],
    isLoading,
    error,
  } = usePantryItemsByType("all");

  const item = useMemo(() => {
    return filteredPantryItems.find((item) => item.id === ingredientId);
  }, [filteredPantryItems, ingredientId]);

  useEffect(() => {
    // Push a new system bar style when the screen mounts
    const entry = SystemBars.pushStackEntry({
      style: "light",
    });

    // Pop it back when leaving (to restore previous settings)
    return () => SystemBars.popStackEntry(entry);
  }, []);

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
        <H1 className="text-center font-urbanist-black">
          Ingredient not found
        </H1>
        <P className="mt-2 text-muted-foreground text-center font-urbanist">
          The ingredient you're looking for doesn't exist.
        </P>
        <Button variant="ghost" className="mt-6" onPress={() => router.back()}>
          <P className="text-center font-urbanist">Go Back</P>
        </Button>
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
