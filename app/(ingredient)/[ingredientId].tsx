import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Platform, View } from "react-native";
import { dummyPantryItems } from "~/data/dummy-data";
import { H1 } from "~/components/ui/typography";
import IngredientView from "~/components/Ingredient/IngredientView";
import SheetModalWrapper from "~/components/SheetModal/SheetModalWrapper";
import type { PantryItem } from "~/types/PantryItem";
import Animated, { useAnimatedRef } from "react-native-reanimated";

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();

  const item = dummyPantryItems.find((item) => item.id === ingredientId);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
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
