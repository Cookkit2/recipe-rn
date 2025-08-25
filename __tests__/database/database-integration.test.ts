/**
 * Database Facade Integration Tests
 * 
 * Comprehensive tests for the SQL database facade system
 * Focuses on WatermelonDB implementation
 */

import {
  databaseFacade,
  DatabaseFactory,
  initializeDatabase,
  getDatabaseStatus,
  isDatabaseReady,
  performMaintenance,
  migrateFromKeyValueStorage,
} from '~/data/database';

import type {
  DatabaseConfig,
  CreatePantryItemData,
  UpdatePantryItemData,
} from '~/data/database';

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('Database Facade Integration Tests', () => {
  const testConfig: DatabaseConfig = {
    type: 'watermelon',
    options: {
      name: 'test_recipe_app.db',
      actionsEnabled: true,
    },
  };

  beforeEach(async () => {
    // Clean up any existing database instance
    if (databaseFacade.isInitialized) {
      await databaseFacade.close();
    }
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    if (databaseFacade.isInitialized) {
      try {
        await databaseFacade.reset();
        await databaseFacade.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // ===============================================
  // Database Initialization Tests
  // ===============================================

  describe('Database Initialization', () => {
    test('should initialize database with WatermelonDB config', async () => {
      await databaseFacade.initialize(testConfig);
      
      expect(databaseFacade.isInitialized).toBe(true);
      expect(databaseFacade.databaseType).toBe('watermelon');
      
      const info = databaseFacade.getInfo();
      expect(info.type).toBe('watermelon');
      expect(info.isConnected).toBe(true);
    });

    test('should initialize with helper function', async () => {
      const facade = await initializeDatabase('testing');
      
      expect(facade).toBe(databaseFacade);
      expect(databaseFacade.isInitialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      const invalidConfig: DatabaseConfig = {
        type: 'invalid' as any,
        options: {},
      };

      await expect(databaseFacade.initialize(invalidConfig)).rejects.toThrow();
      expect(databaseFacade.isInitialized).toBe(false);
    });
  });

  // ===============================================
  // Database Factory Tests
  // ===============================================

  describe('Database Factory', () => {
    test('should create and manage database instances', async () => {
      expect(DatabaseFactory.isInitialized()).toBe(false);
      
      await DatabaseFactory.initialize(testConfig);
      
      expect(DatabaseFactory.isInitialized()).toBe(true);
      expect(DatabaseFactory.getDatabaseType()).toBe('watermelon');
      
      const instance = DatabaseFactory.getInstance();
      expect(instance).toBeTruthy();
      expect(instance.getInfo().type).toBe('watermelon');
    });

    test('should switch between database types', async () => {
      await DatabaseFactory.initialize(testConfig);
      expect(DatabaseFactory.getDatabaseType()).toBe('watermelon');
      
      // Switch to another WatermelonDB instance with different config
      const newConfig: DatabaseConfig = {
        type: 'watermelon',
        options: {
          name: 'another_test.db',
          actionsEnabled: false,
        },
      };
      
      await DatabaseFactory.switchDatabase(newConfig);
      expect(DatabaseFactory.getDatabaseType()).toBe('watermelon');
      expect(DatabaseFactory.getCurrentConfig()).toEqual(newConfig);
    });

    test('should perform health checks', async () => {
      // Before initialization
      let health = await DatabaseFactory.healthCheck();
      expect(health.isHealthy).toBe(false);
      expect(health.type).toBeNull();
      
      // After initialization
      await DatabaseFactory.initialize(testConfig);
      health = await DatabaseFactory.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.type).toBe('watermelon');
    });
  });

  // ===============================================
  // PantryItem Repository Tests
  // ===============================================

  describe('PantryItem Repository', () => {
    beforeEach(async () => {
      await databaseFacade.initialize(testConfig);
    });

    test('should create pantry items', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const newItem: CreatePantryItemData = {
        name: 'Test Apple',
        quantity: 5,
        unit: 'pieces',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'test-image.jpg',
        x: 0,
        y: 0,
        scale: 1,
        expiry_date: new Date('2025-12-31'),
      };

      const created = await pantryRepo.create(newItem);
      
      expect(created).toBeTruthy();
      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Test Apple');
      expect(created.quantity).toBe(5);
      expect(created.type).toBe('fridge');
    });

    test('should find pantry items by ID', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const newItem: CreatePantryItemData = {
        name: 'Test Banana',
        quantity: 3,
        unit: 'pieces',
        category: 'Fruit',
        type: 'cabinet',
        image_url: 'banana.jpg',
        x: 0,
        y: 0,
        scale: 1,
      };

      const created = await pantryRepo.create(newItem);
      const found = await pantryRepo.findById(created.id);
      
      expect(found).toBeTruthy();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Test Banana');
    });

    test('should update pantry items', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const newItem: CreatePantryItemData = {
        name: 'Test Orange',
        quantity: 2,
        unit: 'pieces',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'orange.jpg',
        x: 0,
        y: 0,
        scale: 1,
      };

      const created = await pantryRepo.create(newItem);
      
      const updateData: UpdatePantryItemData = {
        quantity: 10,
        category: 'Citrus',
      };

      const updated = await pantryRepo.update(created.id, updateData);
      
      expect(updated.quantity).toBe(10);
      expect(updated.category).toBe('Citrus');
      expect(updated.name).toBe('Test Orange'); // Should remain unchanged
    });

    test('should delete pantry items', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const newItem: CreatePantryItemData = {
        name: 'Test Grape',
        quantity: 1,
        unit: 'bunch',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'grape.jpg',
        x: 0,
        y: 0,
        scale: 1,
      };

      const created = await pantryRepo.create(newItem);
      
      await pantryRepo.delete(created.id);
      
      const found = await pantryRepo.findById(created.id);
      expect(found).toBeNull();
    });

    test('should find items by type', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      // Create items with different types
      await pantryRepo.create({
        name: 'Fridge Item',
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'fridge',
        image_url: 'test.jpg',
        x: 0,
        y: 0,
        scale: 1,
      });

      await pantryRepo.create({
        name: 'Cabinet Item',
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'cabinet',
        image_url: 'test.jpg',
        x: 0,
        y: 0,
        scale: 1,
      });

      const fridgeItems = await pantryRepo.findByType('fridge');
      const cabinetItems = await pantryRepo.findByType('cabinet');
      
      expect(fridgeItems).toHaveLength(1);
      expect(fridgeItems[0]?.name).toBe('Fridge Item');
      expect(cabinetItems).toHaveLength(1);
      expect(cabinetItems[0]?.name).toBe('Cabinet Item');
    });

    test('should search items by name', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      await pantryRepo.create({
        name: 'Red Apple',
        quantity: 1,
        unit: 'piece',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'apple.jpg',
        x: 0,
        y: 0,
        scale: 1,
      });

      await pantryRepo.create({
        name: 'Green Apple',
        quantity: 1,
        unit: 'piece',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'apple.jpg',
        x: 0,
        y: 0,
        scale: 1,
      });

      await pantryRepo.create({
        name: 'Orange',
        quantity: 1,
        unit: 'piece',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'orange.jpg',
        x: 0,
        y: 0,
        scale: 1,
      });

      const appleResults = await pantryRepo.searchByName('Apple');
      const orangeResults = await pantryRepo.searchByName('Orange');
      
      expect(appleResults).toHaveLength(2);
      expect(orangeResults).toHaveLength(1);
      expect(orangeResults[0]?.name).toBe('Orange');
    });

    test('should find expiring items', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Item expiring soon
      await pantryRepo.create({
        name: 'Expiring Soon',
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'fridge',
        image_url: 'test.jpg',
        x: 0,
        y: 0,
        scale: 1,
        expiry_date: tomorrow,
      });

      // Item not expiring soon
      await pantryRepo.create({
        name: 'Not Expiring',
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'fridge',
        image_url: 'test.jpg',
        x: 0,
        y: 0,
        scale: 1,
        expiry_date: nextWeek,
      });

      const expiringSoon = await pantryRepo.findExpiringSoon(3);
      
      expect(expiringSoon).toHaveLength(1);
      expect(expiringSoon[0]?.name).toBe('Expiring Soon');
    });

    test('should get statistics', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      // Create test data
      await pantryRepo.createMany([
        {
          name: 'Fridge Item 1',
          quantity: 1,
          unit: 'piece',
          category: 'Test',
          type: 'fridge',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        },
        {
          name: 'Cabinet Item 1',
          quantity: 0, // Low quantity
          unit: 'piece',
          category: 'Test',
          type: 'cabinet',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        },
        {
          name: 'Freezer Item 1',
          quantity: 5,
          unit: 'piece',
          category: 'Test',
          type: 'freezer',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
          expiry_date: new Date('2020-01-01'), // Expired
        },
      ]);

      const stats = await pantryRepo.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byType.fridge).toBe(1);
      expect(stats.byType.cabinet).toBe(1);
      expect(stats.byType.freezer).toBe(1);
      expect(stats.lowQuantity).toBe(1);
      expect(stats.expired).toBe(1);
    });

    test('should handle batch operations', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const items: CreatePantryItemData[] = [
        {
          name: 'Batch Item 1',
          quantity: 1,
          unit: 'piece',
          category: 'Test',
          type: 'fridge',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        },
        {
          name: 'Batch Item 2',
          quantity: 2,
          unit: 'piece',
          category: 'Test',
          type: 'cabinet',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        },
      ];

      const created = await pantryRepo.createMany(items);
      
      expect(created).toHaveLength(2);
      expect(created[0]?.name).toBe('Batch Item 1');
      expect(created[1]?.name).toBe('Batch Item 2');
      
      // Test batch delete
      const ids = created.map(item => item.id);
      await pantryRepo.deleteMany(ids);
      
      const remaining = await pantryRepo.findAll();
      expect(remaining).toHaveLength(0);
    });
  });

  // ===============================================
  // Transaction Tests
  // ===============================================

  describe('Database Transactions', () => {
    beforeEach(async () => {
      await databaseFacade.initialize(testConfig);
    });

    test('should handle successful transactions', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      const result = await databaseFacade.transaction(async () => {
        const item1 = await pantryRepo.create({
          name: 'Transaction Item 1',
          quantity: 1,
          unit: 'piece',
          category: 'Test',
          type: 'fridge',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        });

        const item2 = await pantryRepo.create({
          name: 'Transaction Item 2',
          quantity: 2,
          unit: 'piece',
          category: 'Test',
          type: 'cabinet',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        });

        return [item1, item2];
      });

      expect(result).toHaveLength(2);
      
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(2);
    });

    test('should rollback failed transactions', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      await expect(
        databaseFacade.transaction(async () => {
          await pantryRepo.create({
            name: 'Transaction Item',
            quantity: 1,
            unit: 'piece',
            category: 'Test',
            type: 'fridge',
            image_url: 'test.jpg',
            x: 0,
            y: 0,
            scale: 1,
          });

          // Simulate an error
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');

      // Check that no items were created
      const allItems = await pantryRepo.findAll();
      expect(allItems).toHaveLength(0);
    });
  });

  // ===============================================
  // Utility Function Tests
  // ===============================================

  describe('Utility Functions', () => {
    test('should check if database is ready', () => {
      expect(isDatabaseReady()).toBe(false);
    });

    test('should get database status', async () => {
      // Before initialization
      let status = await getDatabaseStatus();
      expect(status.initialized).toBe(false);
      expect(status.healthy).toBe(false);
      
      // After initialization
      await databaseFacade.initialize(testConfig);
      status = await getDatabaseStatus();
      expect(status.initialized).toBe(true);
      expect(status.healthy).toBe(true);
      expect(status.type).toBe('watermelon');
    });

    test('should perform maintenance', async () => {
      await databaseFacade.initialize(testConfig);
      
      // Should not throw
      await expect(performMaintenance()).resolves.not.toThrow();
    });

    test('should migrate from key-value storage', async () => {
      const keyValueData = {
        pantryItems: [
          {
            id: '1',
            name: 'Migrated Apple',
            quantity: 3,
            unit: 'pieces',
            category: 'Fruit',
            type: 'fridge',
            image_url: 'apple.jpg',
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      await migrateFromKeyValueStorage(keyValueData, testConfig);
      
      const pantryRepo = databaseFacade.pantryItems;
      const items = await pantryRepo.findAll();
      
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe('Migrated Apple');
      expect(items[0]?.quantity).toBe(3);
    });
  });

  // ===============================================
  // Error Handling Tests
  // ===============================================

  describe('Error Handling', () => {
    test('should handle database not initialized errors', async () => {
      expect(() => DatabaseFactory.getInstance()).toThrow('Database not initialized');
    });

    test('should handle repository access without initialization', async () => {
      expect(() => databaseFacade.pantryItems).toThrow();
    });

    test('should handle invalid operations', async () => {
      await databaseFacade.initialize(testConfig);
      const pantryRepo = databaseFacade.pantryItems;
      
      // Try to update non-existent item
      await expect(
        pantryRepo.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow();
      
      // Try to delete non-existent item
      await expect(
        pantryRepo.delete('non-existent-id')
      ).rejects.toThrow();
    });
  });

  // ===============================================
  // Memory and Performance Tests
  // ===============================================

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await databaseFacade.initialize(testConfig);
    });

    test('should handle large datasets efficiently', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      // Create a large number of items
      const items: CreatePantryItemData[] = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Item ${i}`,
        quantity: i + 1,
        unit: 'piece',
        category: 'Bulk',
        type: 'cabinet',
        image_url: `item${i}.jpg`,
        x: 0,
        y: 0,
        scale: 1,
      }));

      const startTime = Date.now();
      const created = await pantryRepo.createMany(items);
      const endTime = Date.now();
      
      expect(created).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Test querying performance
      const queryStartTime = Date.now();
      const found = await pantryRepo.findAll();
      const queryEndTime = Date.now();
      
      expect(found).toHaveLength(100);
      expect(queryEndTime - queryStartTime).toBeLessThan(1000); // Should complete within 1 second
    }, 10000); // 10 second timeout

    test('should handle pagination efficiently', async () => {
      const pantryRepo = databaseFacade.pantryItems;
      
      // Create test data
      const items: CreatePantryItemData[] = Array.from({ length: 50 }, (_, i) => ({
        name: `Page Item ${i}`,
        quantity: 1,
        unit: 'piece',
        category: 'Test',
        type: 'fridge',
        image_url: 'test.jpg',
        x: 0,
        y: 0,
        scale: 1,
      }));

      await pantryRepo.createMany(items);
      
      // Test pagination
      const page1 = await pantryRepo.findPaginated({ page: 1, pageSize: 10 });
      const page2 = await pantryRepo.findPaginated({ page: 2, pageSize: 10 });
      
      expect(page1.data).toHaveLength(10);
      expect(page2.data).toHaveLength(10);
      expect(page1.pagination.total).toBe(50);
      expect(page1.pagination.totalPages).toBe(5);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrevious).toBe(true);
    });
  });
});
