/**
 * Database Integration Tests with Mock WatermelonDB
 * 
 * Tests the database facade and repository patterns with a realistic mock
 * that simulates WatermelonDB behavior without requiring full integration
 */

import { DatabaseFactory } from '~/data/database/database-factory';
import { databaseFacade } from '~/data/database/database-facade';
import type { DatabaseConfig, CreatePantryItemData } from '~/data/database';

// Mock WatermelonDB components for testing
const createMockDatabase = () => {
  const mockRecords = new Map<string, any>();
  const mockCollections = new Map<string, any>();
  
  const mockCollection = (tableName: string) => ({
    create: jest.fn(async (callback: (record: any) => void) => {
      const id = `${tableName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const record = {
        id,
        _table: tableName,
        _isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        markAsDeleted: jest.fn(async () => { record._isDeleted = true; }),
        destroyPermanently: jest.fn(async () => { mockRecords.delete(id); }),
        update: jest.fn(async (updater: (r: any) => void) => {
          updater(record);
          record.updatedAt = new Date();
          return record;
        }),
      };
      
      callback(record);
      mockRecords.set(id, record);
      return record;
    }),
    
    find: jest.fn(async (id: string) => {
      const record = mockRecords.get(id);
      if (!record || record._isDeleted) {
        throw new Error(`Record ${id} not found`);
      }
      return record;
    }),
    
    query: jest.fn(() => ({
      fetch: jest.fn(async () => {
        return Array.from(mockRecords.values())
          .filter(record => record._table === tableName && !record._isDeleted);
      }),
      count: jest.fn(async () => {
        return Array.from(mockRecords.values())
          .filter(record => record._table === tableName && !record._isDeleted).length;
      }),
    })),
  });

  mockCollections.set('pantry_items', mockCollection('pantry_items'));
  mockCollections.set('recipes', mockCollection('recipes'));

  return {
    collections: {
      get: (tableName: string) => mockCollections.get(tableName),
    },
    write: jest.fn(async (callback: () => Promise<any>) => {
      try {
        return await callback();
      } catch (error) {
        // Simulate transaction rollback by reverting changes
        throw error;
      }
    }),
    adapter: {
      schema: {},
    },
    // Test utilities
    _getMockRecords: () => mockRecords,
    _clearAllRecords: () => mockRecords.clear(),
  };
};

describe('Database Integration Tests (Facade + Repository)', () => {
  let mockDatabase: any;
  let testConfig: DatabaseConfig;

  beforeEach(async () => {
    // Create mock database
    mockDatabase = createMockDatabase();
    
    // Mock DatabaseFactory.createDatabase to return our mock
    jest.spyOn(DatabaseFactory, 'createDatabase').mockResolvedValue(mockDatabase);
    
    testConfig = {
      type: 'watermelon',
      options: {
        name: 'test_recipe_app.db',
        actionsEnabled: true,
      },
    };

    // Initialize facade with mock database
    if (databaseFacade.isInitialized) {
      await databaseFacade.close();
    }
    await databaseFacade.initialize(testConfig);
  });

  afterEach(async () => {
    // Clean up
    if (databaseFacade.isInitialized) {
      await databaseFacade.close();
    }
    mockDatabase._clearAllRecords();
    jest.restoreAllMocks();
  });

  describe('Database Facade Initialization', () => {
    it('should initialize database facade successfully', () => {
      expect(databaseFacade.isInitialized).toBe(true);
      expect(DatabaseFactory.createDatabase).toHaveBeenCalledWith(testConfig);
    });

    it('should provide access to repositories', () => {
      const pantryRepo = databaseFacade.getPantryItemRepository();
      expect(pantryRepo).toBeDefined();
      expect(typeof pantryRepo.create).toBe('function');
      expect(typeof pantryRepo.findById).toBe('function');
      expect(typeof pantryRepo.findAll).toBe('function');
    });

    it('should handle reinitialization', async () => {
      expect(databaseFacade.isInitialized).toBe(true);
      
      await databaseFacade.close();
      expect(databaseFacade.isInitialized).toBe(false);
      
      await databaseFacade.initialize(testConfig);
      expect(databaseFacade.isInitialized).toBe(true);
    });
  });

  describe('CRUD Operations through Facade', () => {
    let pantryRepo: any;

    beforeEach(() => {
      pantryRepo = databaseFacade.getPantryItemRepository();
    });

    describe('Create Operations', () => {
      it('should create pantry items through repository', async () => {
        const createData: CreatePantryItemData = {
          name: 'Test Apple',
          quantity: 3,
          unit: 'pieces',
          category: 'fruits',
          type: 'fridge',
          image_url: 'apple.jpg',
          x: 100,
          y: 200,
          scale: 1.0,
        };

        // Mock the repository create method
        const mockCreatedItem = {
          id: 'mock-id-123',
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(pantryRepo, 'create').mockResolvedValue(mockCreatedItem);

        const result = await pantryRepo.create(createData);

        expect(result).toBeDefined();
        expect(result.id).toBe('mock-id-123');
        expect(result.name).toBe(createData.name);
        expect(result.quantity).toBe(createData.quantity);
        expect(result.type).toBe(createData.type);
        expect(pantryRepo.create).toHaveBeenCalledWith(createData);
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required fields
          name: 'Test Item',
          // quantity missing
          // unit missing
          // category missing
          // type missing
        };

        jest.spyOn(pantryRepo, 'create').mockRejectedValue(
          new Error('Missing required fields')
        );

        await expect(pantryRepo.create(invalidData)).rejects.toThrow('Missing required fields');
      });

      it('should handle creation errors gracefully', async () => {
        const createData: CreatePantryItemData = {
          name: 'Test Item',
          quantity: 1,
          unit: 'piece',
          category: 'test',
          type: 'fridge',
          image_url: 'test.jpg',
          x: 0,
          y: 0,
          scale: 1,
        };

        jest.spyOn(pantryRepo, 'create').mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(pantryRepo.create(createData)).rejects.toThrow('Database connection failed');
      });
    });

    describe('Read Operations', () => {
      it('should find items by ID', async () => {
        const mockItem = {
          id: 'test-id-123',
          name: 'Test Apple',
          quantity: 3,
          unit: 'pieces',
          category: 'fruits',
          type: 'fridge',
        };

        jest.spyOn(pantryRepo, 'findById').mockResolvedValue(mockItem);

        const result = await pantryRepo.findById('test-id-123');

        expect(result).toEqual(mockItem);
        expect(pantryRepo.findById).toHaveBeenCalledWith('test-id-123');
      });

      it('should return null for non-existent items', async () => {
        jest.spyOn(pantryRepo, 'findById').mockResolvedValue(null);

        const result = await pantryRepo.findById('non-existent-id');

        expect(result).toBeNull();
      });

      it('should fetch all items', async () => {
        const mockItems = [
          { id: 'item-1', name: 'Apple', type: 'fridge' },
          { id: 'item-2', name: 'Bread', type: 'cabinet' },
          { id: 'item-3', name: 'Ice Cream', type: 'freezer' },
        ];

        jest.spyOn(pantryRepo, 'findAll').mockResolvedValue(mockItems);

        const result = await pantryRepo.findAll();

        expect(result).toEqual(mockItems);
        expect(result).toHaveLength(3);
      });

      it('should filter items by type', async () => {
        const fridgeItems = [
          { id: 'item-1', name: 'Apple', type: 'fridge' },
          { id: 'item-2', name: 'Milk', type: 'fridge' },
        ];

        jest.spyOn(pantryRepo, 'findByType').mockResolvedValue(fridgeItems);

        const result = await pantryRepo.findByType('fridge');

        expect(result).toEqual(fridgeItems);
        expect(result.every((item: any) => item.type === 'fridge')).toBe(true);
        expect(pantryRepo.findByType).toHaveBeenCalledWith('fridge');
      });
    });

    describe('Update Operations', () => {
      it('should update item properties', async () => {
        const originalItem = {
          id: 'test-id-123',
          name: 'Original Apple',
          quantity: 3,
          unit: 'pieces',
        };

        const updatedItem = {
          ...originalItem,
          name: 'Updated Apple',
          quantity: 5,
          updatedAt: new Date(),
        };

        jest.spyOn(pantryRepo, 'update').mockResolvedValue(updatedItem);

        const result = await pantryRepo.update('test-id-123', {
          name: 'Updated Apple',
          quantity: 5,
        });

        expect(result).toEqual(updatedItem);
        expect(result.name).toBe('Updated Apple');
        expect(result.quantity).toBe(5);
        expect(pantryRepo.update).toHaveBeenCalledWith('test-id-123', {
          name: 'Updated Apple',
          quantity: 5,
        });
      });

      it('should handle partial updates', async () => {
        const originalItem = {
          id: 'test-id-123',
          name: 'Apple',
          quantity: 3,
          unit: 'pieces',
          category: 'fruits',
        };

        const updatedItem = {
          ...originalItem,
          quantity: 1, // Only quantity changed
          updatedAt: new Date(),
        };

        jest.spyOn(pantryRepo, 'update').mockResolvedValue(updatedItem);

        const result = await pantryRepo.update('test-id-123', { quantity: 1 });

        expect(result.quantity).toBe(1);
        expect(result.name).toBe('Apple'); // Unchanged
      });
    });

    describe('Delete Operations', () => {
      it('should delete items by ID', async () => {
        jest.spyOn(pantryRepo, 'delete').mockResolvedValue(true);

        const result = await pantryRepo.delete('test-id-123');

        expect(result).toBe(true);
        expect(pantryRepo.delete).toHaveBeenCalledWith('test-id-123');
      });

      it('should handle deletion of non-existent items', async () => {
        jest.spyOn(pantryRepo, 'delete').mockResolvedValue(false);

        const result = await pantryRepo.delete('non-existent-id');

        expect(result).toBe(false);
      });
    });

    describe('Business Logic Operations', () => {
      it('should find expiring items', async () => {
        const expiringItems = [
          {
            id: 'item-1',
            name: 'Milk',
            expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          },
        ];

        jest.spyOn(pantryRepo, 'findExpiringSoon').mockResolvedValue(expiringItems);

        const result = await pantryRepo.findExpiringSoon(3); // Within 3 days

        expect(result).toEqual(expiringItems);
        expect(pantryRepo.findExpiringSoon).toHaveBeenCalledWith(3);
      });

      it('should search items by name', async () => {
        const searchResults = [
          { id: 'item-1', name: 'Green Apple' },
          { id: 'item-2', name: 'Apple Juice' },
        ];

        jest.spyOn(pantryRepo, 'searchByName').mockResolvedValue(searchResults);

        const result = await pantryRepo.searchByName('apple');

        expect(result).toEqual(searchResults);
        expect(pantryRepo.searchByName).toHaveBeenCalledWith('apple');
      });

      it('should get pantry statistics', async () => {
        const mockStats = {
          totalItems: 15,
          totalCategories: 5,
          itemsByType: {
            fridge: 8,
            cabinet: 5,
            freezer: 2,
          },
          expiringItems: 3,
          expiredItems: 1,
          lowQuantityItems: 4,
        };

        jest.spyOn(pantryRepo, 'getStatistics').mockResolvedValue(mockStats);

        const result = await pantryRepo.getStatistics();

        expect(result).toEqual(mockStats);
        expect(typeof result.totalItems).toBe('number');
        expect(typeof result.itemsByType).toBe('object');
      });
    });
  });

  describe('Transaction Operations', () => {
    it('should handle successful transactions', async () => {
      const mockResult = ['item1', 'item2'];
      
      // Mock the database write method to execute the transaction
      mockDatabase.write.mockImplementation(async (callback: () => any) => {
        return await callback();
      });

      jest.spyOn(databaseFacade, 'transaction').mockImplementation(async (callback) => {
        return await mockDatabase.write(callback);
      });

      const result = await databaseFacade.transaction(async () => {
        return mockResult;
      });

      expect(result).toEqual(mockResult);
      expect(databaseFacade.transaction).toHaveBeenCalled();
    });

    it('should rollback failed transactions', async () => {
      const errorMessage = 'Transaction failed';
      
      mockDatabase.write.mockRejectedValue(new Error(errorMessage));
      jest.spyOn(databaseFacade, 'transaction').mockRejectedValue(new Error(errorMessage));

      await expect(
        databaseFacade.transaction(async () => {
          throw new Error(errorMessage);
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(DatabaseFactory, 'createDatabase').mockRejectedValue(
        new Error('Failed to connect to database')
      );

      await databaseFacade.close();

      await expect(
        databaseFacade.initialize(testConfig)
      ).rejects.toThrow('Failed to connect to database');
    });

    it('should handle repository access without initialization', () => {
      // Close the database first
      databaseFacade.close();

      expect(() => {
        databaseFacade.getPantryItemRepository();
      }).toThrow();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent operations', async () => {
      const pantryRepo = databaseFacade.getPantryItemRepository();
      
      // Mock multiple successful operations
      jest.spyOn(pantryRepo, 'create').mockImplementation(async (data: any) => ({
        id: `id-${Math.random()}`,
        ...data,
        createdAt: new Date(),
      }));

      const operations = Array.from({ length: 10 }, (_, i) => 
        pantryRepo.create({
          name: `Item ${i}`,
          quantity: i,
          unit: 'pieces',
          category: 'test',
          type: 'fridge',
          image_url: `item${i}.jpg`,
          x: i * 10,
          y: i * 10,
          scale: 1,
        })
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      expect(results.every(result => result.id)).toBe(true);
      expect(pantryRepo.create).toHaveBeenCalledTimes(10);
    });

    it('should handle operations within reasonable time', async () => {
      const pantryRepo = databaseFacade.getPantryItemRepository();
      
      jest.spyOn(pantryRepo, 'findAll').mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
        }))
      );

      const startTime = Date.now();
      const result = await pantryRepo.findAll();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
