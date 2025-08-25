import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { dummyPantryItems } from "~/data/dummy-data";
import { H1 } from "~/components/ui/typography";
import IngredientView from "~/components/Ingredient/IngredientView";
import SheetModalWrapper from "~/components/SheetModal/SheetModalWrapper";
import { useState, useEffect } from "react";
import { databaseFacade } from "~/data/database";
import type { PantryItem } from "~/types/PantryItem";

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  
  const [item, setItem] = useState<PantryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findIngredient = async () => {
      try {
        // First try to find in dummy data (for dummy mode)
        const dummyItem = dummyPantryItems.find((item) => item.id === ingredientId);
        
        if (dummyItem) {
          setItem(dummyItem);
          setIsLoading(false);
          return;
        }

        // If not found in dummy data and database is available, search in database
        if (databaseFacade.isInitialized) {
          console.log(`🔍 Searching for ingredient in database: ${ingredientId}`);
          const pantryRepo = databaseFacade.pantryItems;
          const dbItem = await pantryRepo.findById(ingredientId);
          
          if (dbItem) {
            // Convert database item to UI format
            const uiItem: PantryItem = {
              ...dbItem,
              steps_to_store: [],
              created_at: dbItem.created_at || new Date(),
              updated_at: dbItem.updated_at || new Date(),
              image_url: dbItem.image_url as any,
            };
            console.log(`✅ Found ingredient in database: ${uiItem.name}`);
            setItem(uiItem);
          } else {
            console.log(`❌ Ingredient not found in database: ${ingredientId}`);
            setItem(null);
          }
        } else {
          console.log(`❌ Database not initialized, ingredient not found: ${ingredientId}`);
          setItem(null);
        }
      } catch (error) {
        console.error('❌ Error finding ingredient:', error);
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    findIngredient();
  }, [ingredientId]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Loading...</H1>
      </View>
    );
  }

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
