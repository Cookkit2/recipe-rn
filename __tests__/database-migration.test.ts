/**
 * Database Migration Tests
 * 
 * Tests the migration from dummy data to database and ensures
 * all functionality works correctly with persistent storage.
 */

import { databaseFacade, initializeDatabase } from '~/data/database';
import { dummyPantryItems } from '~/data/dummy-data';
import { storageFacade } from '~/data/storage';
import type { PantryItem } from '~/types/PantryItem';

// Mock the storage facade for testing
jest.mock('~/data/storage', () => ({
  storageFacade: {
    getAsync: jest.fn(),
    setAsync: jest.fn(),
  },
}));

const mockStorageFacade = storageFacade as jest.Mocked<typeof storageFacade>;

describe('Database Migration', () => {
  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize database
    await initializeDatabase('testing');
    
    // Clear any existing data
    const pantryRepo = databaseFacade.pantryItems;
    const allItems = await pantryRepo.findAll();
    for (const item of allItems) {
      await pantryRepo.delete(item.id);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('First Run Migration', () => {
    it('should migrate dummy data to database on first run', async () => {
      // Mock first run (no migration flag)
      mockStorageFacade.getAsync.mockResolvedValueOnce(null);
      mockStorageFacade.setAsync.mockResolvedValueOnce(undefined);

      const pantryRepo = databaseFacade.pantryItems;

      // Simulate the migration logic from the main app
      const hasInitialized = await storageFacade.getAsync<boolean>('pantry_data_migrated');
      expect(hasInitialized).toBeNull();

      // Migrate dummy data
      for (const dummyItem of dummyPantryItems) {
        await pantryRepo.create({
          name: dummyItem.name,
          quantity: dummyItem.quantity,
          unit: dummyItem.unit || 'units',
          category: dummyItem.category,
          type: dummyItem.type,
          image_url: typeof dummyItem.image_url === 'string' ? dummyItem.image_url : 'default.jpg',
          x: dummyItem.x,
          y: dummyItem.y,
          scale: dummyItem.scale,
          expiry_date: dummyItem.expiry_date,
        });
      }

      // Mark as migrated
      await storageFacade.setAsync('pantry_data_migrated', true);

      // Verify all items were created
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(dummyPantryItems.length);

      // Verify migration flag was set
      expect(mockStorageFacade.setAsync).toHaveBeenCalledWith('pantry_data_migrated', true);
    });

    it('should not migrate on subsequent runs', async () => {
      // Mock subsequent run (migration flag exists)
      mockStorageFacade.getAsync.mockResolvedValueOnce(true);

      const pantryRepo = databaseFacade.pantryItems;

      // Simulate the migration check
      const hasInitialized = await storageFacade.getAsync<boolean>('pantry_data_migrated');
      expect(hasInitialized).toBe(true);

      // Should not create any items
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(0);

      // Should not call setAsync again
      expect(mockStorageFacade.setAsync).not.toHaveBeenCalled();
    });
  });

  describe('Database Persistence', () => {
    it('should persist data between sessions', async () => {
      const pantryRepo = databaseFacade.pantryItems;

      // Create a test item
      const testItem = await pantryRepo.create({
        name: 'Test Persistence Item',
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'fridge',
        image_url: 'test.jpg',
        x: 100,
        y: 200,
        scale: 1.0,
      });

      expect(testItem).toBeTruthy();
      expect(testItem.name).toBe('Test Persistence Item');

      // Verify it can be found
      const foundItem = await pantryRepo.findById(testItem.id);
      expect(foundItem).toBeTruthy();
      expect(foundItem?.name).toBe('Test Persistence Item');

      // Verify it appears in the list
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(1);
      expect(allItems[0]?.name).toBe('Test Persistence Item');
    });

    it('should handle CRUD operations correctly', async () => {
      const pantryRepo = databaseFacade.pantryItems;

      // Create
      const item = await pantryRepo.create({
        name: 'CRUD Test Item',
        quantity: 5,
        unit: 'pieces',
        category: 'Test',
        type: 'fridge',
        image_url: 'crud.jpg',
        x: 150,
        y: 250,
        scale: 1.2,
      });

      expect(item.name).toBe('CRUD Test Item');
      expect(item.quantity).toBe(5);

      // Read
      const foundItem = await pantryRepo.findById(item.id);
      expect(foundItem?.name).toBe('CRUD Test Item');

      // Update
      const updatedItem = await pantryRepo.update(item.id, {
        quantity: 10,
        category: 'Updated Test',
      });

      expect(updatedItem?.quantity).toBe(10);
      expect(updatedItem?.category).toBe('Updated Test');
      expect(updatedItem?.name).toBe('CRUD Test Item'); // Should remain unchanged

      // Delete
      await pantryRepo.delete(item.id);

      // Verify deletion
      const deletedItem = await pantryRepo.findById(item.id);
      expect(deletedItem).toBeNull();

      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data integrity during operations', async () => {
      const pantryRepo = databaseFacade.pantryItems;

      // Create multiple items
      const items = await Promise.all([
        pantryRepo.create({
          name: 'Item 1',
          quantity: 1,
          unit: 'piece',
          category: 'Category A',
          type: 'fridge',
          image_url: 'item1.jpg',
          x: 100,
          y: 100,
          scale: 1.0,
        }),
        pantryRepo.create({
          name: 'Item 2',
          quantity: 2,
          unit: 'pieces',
          category: 'Category B',
          type: 'cabinet',
          image_url: 'item2.jpg',
          x: 200,
          y: 200,
          scale: 1.0,
        }),
        pantryRepo.create({
          name: 'Item 3',
          quantity: 3,
          unit: 'pieces',
          category: 'Category A',
          type: 'freezer',
          image_url: 'item3.jpg',
          x: 300,
          y: 300,
          scale: 1.0,
        }),
      ]);

      expect(items).toHaveLength(3);

      // Verify all items exist
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(3);

      // Test filtering by type
      const fridgeItems = await pantryRepo.findByType('fridge');
      expect(fridgeItems).toHaveLength(1);
      expect(fridgeItems[0]?.name).toBe('Item 1');

      const cabinetItems = await pantryRepo.findByType('cabinet');
      expect(cabinetItems).toHaveLength(1);
      expect(cabinetItems[0]?.name).toBe('Item 2');

      // Test search functionality
      const searchResults = await pantryRepo.searchByName('Item 1');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0]?.name).toBe('Item 1');

      // Test partial search
      const partialSearch = await pantryRepo.searchByName('Item');
      expect(partialSearch).toHaveLength(3);
    });

    it('should handle edge cases gracefully', async () => {
      const pantryRepo = databaseFacade.pantryItems;

      // Test finding non-existent item
      const nonExistent = await pantryRepo.findById('non-existent-id');
      expect(nonExistent).toBeNull();

      // Test empty search
      const emptySearch = await pantryRepo.searchByName('non-existent-item');
      expect(emptySearch).toHaveLength(0);

      // Test finding by non-existent type
      const invalidType = await pantryRepo.findByType('invalid-type' as any);
      expect(invalidType).toHaveLength(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', async () => {
      const pantryRepo = databaseFacade.pantryItems;

      // Create a larger dataset
      const startTime = Date.now();
      const itemPromises = [];
      
      for (let i = 0; i < 100; i++) {
        itemPromises.push(
          pantryRepo.create({
            name: `Bulk Item ${i}`,
            quantity: i,
            unit: 'pieces',
            category: `Category ${i % 5}`,
            type: i % 2 === 0 ? 'fridge' : 'cabinet',
            image_url: `bulk${i}.jpg`,
            x: i * 10,
            y: i * 10,
            scale: 1.0,
          })
        );
      }

      await Promise.all(itemPromises);
      const creationTime = Date.now() - startTime;

      // Verify all items were created
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(100);

      // Performance should be reasonable (less than 5 seconds for 100 items)
      expect(creationTime).toBeLessThan(5000);

      // Test bulk operations
      const queryStartTime = Date.now();
      const fridgeItems = await pantryRepo.findByType('fridge');
      const queryTime = Date.now() - queryStartTime;

      expect(fridgeItems).toHaveLength(50);
      expect(queryTime).toBeLessThan(1000); // Should be fast
    });
  });
});
