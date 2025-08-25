import { FlatList, View } from "react-native";
import { H1, H4 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { IngredientItemCard } from "~/components/Ingredient/IngredientItemCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToggleButtonGroup from "~/components/Pantry/ToggleButtonGroup";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import AddPantryItemModal from "~/components/Pantry/AddPantryItemModal";
import useItemTypeStore from "~/store/type-store";
import RecipeButton from "~/components/Pantry/RecipeButton";
import { useSharedValue } from "react-native-reanimated";
import { useState, useEffect } from "react";
import { databaseFacade, initializeDatabase } from "~/data/database";
import type { PantryItem } from "~/types/PantryItem";
import type { PantryItemModel } from "~/data/database/models/PantryItem";

export default function IngredientScreen() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();
  const { selectedItemType } = useItemTypeStore();

  const localScrollY = useSharedValue(0);
  
  // Database state
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [useDatabase, setUseDatabase] = useState(false); // Toggle for testing

  // Initialize database and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing database...');
        await initializeDatabase('development');
        console.log('✅ Database initialized successfully');
        setIsDatabaseReady(true);
        
        if (useDatabase) {
          await loadPantryItems();
        } else {
          // Use dummy data for comparison
          setPantryItems(dummyPantryItems);
        }
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // Fallback to dummy data
        setPantryItems(dummyPantryItems);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [useDatabase]);

  // Refresh UI based on current mode
  const refreshUI = async () => {
    if (useDatabase) {
      await loadPantryItems();
    } else {
      setPantryItems(dummyPantryItems);
    }
  };

  const loadPantryItems = async () => {
    try {
      if (!databaseFacade.isInitialized) {
        console.warn('Database not initialized, using dummy data');
        setPantryItems(dummyPantryItems);
        return;
      }

      console.log('📦 Loading pantry items from database...');
      const pantryRepo = databaseFacade.pantryItems;
      const dbItems = await pantryRepo.findAll();
      console.log(`✅ Loaded ${dbItems.length} items from database`);
      
      // Convert database items to UI format (add missing fields)
      const uiItems: PantryItem[] = dbItems.map(item => ({
        ...item,
        steps_to_store: [], // Default empty array for now
        created_at: item.created_at || new Date(),
        updated_at: item.updated_at || new Date(),
        image_url: item.image_url as any, // Type assertion for ImageSourcePropType
      }));
      
      setPantryItems(uiItems);
    } catch (error) {
      console.error('❌ Failed to load pantry items:', error);
      // Fallback to dummy data
      setPantryItems(dummyPantryItems);
    }
  };

  // Test function to populate database with sample data
  const populateTestData = async () => {
    try {
      if (!databaseFacade.isInitialized) {
        console.error('Database not initialized');
        return;
      }

      if (!useDatabase) {
        console.warn('Not in database mode, cannot add test data');
        return;
      }

      console.log('🧪 Adding test data to database...');
      const pantryRepo = databaseFacade.pantryItems;
      
      const testItems = [
        {
          name: 'Test Apples',
          quantity: 5,
          unit: 'pieces',
          category: 'Fruit',
          type: 'fridge' as const,
          image_url: 'apple.jpg',
          x: 100,
          y: 200,
          scale: 1.0,
        },
        {
          name: 'Test Bread',
          quantity: 1,
          unit: 'loaf',
          category: 'Bakery',
          type: 'cabinet' as const,
          image_url: 'bread.jpg',
          x: 150,
          y: 250,
          scale: 1.2,
        },
        {
          name: 'Test Ice Cream',
          quantity: 2,
          unit: 'containers',
          category: 'Dessert',
          type: 'freezer' as const,
          image_url: 'icecream.jpg',
          x: 200,
          y: 300,
          scale: 0.8,
        },
      ];

      for (const item of testItems) {
        await pantryRepo.create(item);
      }

      console.log(`✅ Added ${testItems.length} test items to database`);
      
      // Force refresh the UI
      await refreshUI();
    } catch (error) {
      console.error('❌ Failed to add test data:', error);
    }
  };

  const clearDatabase = async () => {
    try {
      if (!databaseFacade.isInitialized) {
        console.error('Database not initialized');
        return;
      }

      if (!useDatabase) {
        console.warn('Not in database mode, cannot clear database');
        return;
      }

      console.log('🗑️ Clearing database...');
      const pantryRepo = databaseFacade.pantryItems;
      const allItems = await pantryRepo.findAll();
      console.log(`📋 Found ${allItems.length} items to delete`);
      
      for (const item of allItems) {
        console.log(`🗑️ Deleting item: ${item.id} - ${(item as any).name}`);
        await pantryRepo.delete(item.id);
      }

      console.log(`✅ Cleared ${allItems.length} items from database`);
      
      // Verify deletion
      const remainingItems = await pantryRepo.findAll();
      console.log(`📋 Items remaining after deletion: ${remainingItems.length}`);
      
      // Force refresh the UI
      await refreshUI();
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
    }
  };

  const filteredItems = pantryItems.filter((item) => {
    if (selectedItemType === "all") return true;
    return item.type === selectedItemType;
  });

  // Show loading state
  if (isLoading) {
    return (
      <View className="relative flex-1 bg-background items-center justify-center" style={{ paddingTop: pt }}>
        <H4 className="text-muted-foreground">Loading...</H4>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-background" style={{ paddingTop: pt }}>
      <View className="px-6 flex-row items-center my-4 gap-3">
        <H1 className="font-bowlby-one leading-[1.6]">Pantry</H1>
        {/* Database Testing Toggle */}
        <View className="bg-gray-100 px-2 py-1 rounded">
          <H4 
            className={`text-xs ${useDatabase ? 'text-green-600' : 'text-blue-600'}`}
            onPress={() => setUseDatabase(!useDatabase)}
          >
            {useDatabase ? 'DB' : 'DUMMY'}
          </H4>
        </View>
        <View className="flex-1" />
        <AddPantryItemModal />
        <MenuDropdown />
      </View>
      
      {/* Database Status Indicator */}
      <View className="px-6 mb-2">
        <H4 className={`text-xs ${isDatabaseReady ? 'text-green-600' : 'text-red-600'}`}>
          DB: {isDatabaseReady ? '✅ Ready' : '❌ Not Ready'} | 
          Items: {pantryItems.length} | 
          Source: {useDatabase ? 'Database' : 'Dummy Data'}
        </H4>
      </View>

      {/* Testing Buttons */}
      {isDatabaseReady && useDatabase && (
        <View className="px-6 mb-2 flex-row gap-2">
          <View className="bg-blue-100 px-3 py-1 rounded">
            <H4 className="text-xs text-blue-600" onPress={populateTestData}>
              Add Test Data
            </H4>
          </View>
          <View className="bg-red-100 px-3 py-1 rounded">
            <H4 className="text-xs text-red-600" onPress={clearDatabase}>
              Clear DB
            </H4>
          </View>
        </View>
      )}
      
      <ToggleButtonGroup scrollY={localScrollY} />
      <FlatList
        numColumns={2}
        className="p-3 pt-0"
        contentContainerStyle={{ paddingBottom: 64 + pb }}
        showsVerticalScrollIndicator={false}
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IngredientItemCard key={item.id} item={item} />
        )}
        onScroll={(e) => (localScrollY.value = e.nativeEvent.contentOffset.y)}
        ListEmptyComponent={
          <View className="py-16 items-center justify-center">
            <H4 className="text-muted-foreground text-center">No items</H4>
          </View>
        }
      />
      <RecipeButton />
    </View>
  );
}
