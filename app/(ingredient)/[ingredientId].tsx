import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { dummyPantryItems } from "~/data/dummy-data";
import { H1 } from "~/components/ui/typography";
import IngredientView from "~/components/Ingredient/IngredientView";
import SheetModalWrapper from "~/components/SheetModal/SheetModalWrapper";

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const numericId =
    typeof ingredientId === "string"
      ? parseInt(ingredientId, 10)
      : Array.isArray(ingredientId)
        ? parseInt(ingredientId[0], 10)
        : 0;
  const item = dummyPantryItems.find((item) => item.id === numericId);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
      </View>
    );
  }

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
}
