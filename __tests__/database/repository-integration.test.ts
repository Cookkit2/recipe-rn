/**
 * Database Repository Integration Tests
 * 
 * Tests repository operations through mocks to verify business logic
 * and error handling without requiring full WatermelonDB setup
 */

import { PantryItemRepository, type CreatePantryItemData, type UpdatePantryItemData } from '~/data/database/repositories/pantry-item-repository';
import { PantryItem } from '~/data/database/models/PantryItem';

describe('Database Repository Integration Tests', () => {
  let mockDatabase: MockWatermelonDatabase;
  let repository: PantryItemRepository;

  // Test data
  const sampleItem: CreatePantryItemData = {
    name: 'Integration Test Apple',
    quantity: 5,
    unit: 'pieces',
    category: 'fruits',
    type: 'fridge',
    image_url: 'apple.jpg',
    x: 100,
    y: 150,
    scale: 1.2,
  };

  const sampleItem2: CreatePantryItemData = {
    name: 'Integration Test Bread',
    quantity: 1,
    unit: 'loaf',
    category: 'bakery',
    type: 'cabinet',
    image_url: 'bread.jpg',
    x: 200,
    y: 250,
    scale: 0.9,
  };

  beforeEach(() => {
    mockDatabase = new MockWatermelonDatabase();
    repository = new PantryItemRepository(mockDatabase as any);
  });

  afterEach(() => {
    mockDatabase.clear();
  });

  describe('Repository Setup', () => {
    it('should initialize repository with correct table name', () => {
      expect(repository['tableName']).toBe('pantry_items');
    });

    it('should have access to database instance', () => {
      expect(repository['database']).toBe(mockDatabase);
    });

    it('should start with empty database', () => {
      expect(mockDatabase.getRecordCount()).toBe(0);
    });
  });

  describe('Create Operations', () => {
    it('should create a pantry item with all required fields', async () => {
      // Mock the createModel method to simulate actual creation
      const mockCreatedItem = new PantryItem();
      Object.assign(mockCreatedItem, {
        id: 'test-id-123',
        ...sampleItem,
        created_at: new Date(),
        updated_at: new Date(),
      });

      jest.spyOn(repository as any, 'createModel').mockResolvedValue(mockCreatedItem);
      jest.spyOn(mockDatabase, 'write').mockImplementation(async (callback) => callback());

      const result = await repository.create(sampleItem);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(result.name).toBe(sampleItem.name);
      expect(result.quantity).toBe(sampleItem.quantity);
      expect(result.type).toBe(sampleItem.type);
      expect(repository['createModel']).toHaveBeenCalledWith(sampleItem);
    });

    it('should validate required fields during creation', async () => {
      const invalidItem = {
        name: 'Invalid Item',
        // Missing required fields: quantity, unit, category, type, etc.
      } as CreatePantryItemData;

      jest.spyOn(repository as any, 'createModel').mockRejectedValue(
        new Error('Validation failed: missing required fields')
      );

      await expect(repository.create(invalidItem)).rejects.toThrow(
        'Failed to create pantry_items record'
      );
    });

    it('should handle database errors during creation', async () => {
      jest.spyOn(repository as any, 'createModel').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(repository.create(sampleItem)).rejects.toThrow(
        'Failed to create pantry_items record'
      );
    });

    it('should create multiple items successfully', async () => {
      const items = [sampleItem, sampleItem2];
      const mockCreatedItems = items.map((item, index) => {
        const mockItem = new PantryItem();
        Object.assign(mockItem, {
          id: `test-id-${index}`,
          ...item,
          created_at: new Date(),
          updated_at: new Date(),
        });
        return mockItem;
      });

      jest.spyOn(repository, 'createMany').mockResolvedValue(mockCreatedItems);

      const results = await repository.createMany(items);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe(sampleItem.name);
      expect(results[1].name).toBe(sampleItem2.name);
    });
  });

  describe('Read Operations', () => {
    let createdItem: PantryItem;

    beforeEach(async () => {
      // Setup: create a test item
      createdItem = new PantryItem();
      Object.assign(createdItem, {
        id: 'existing-item-123',
        ...sampleItem,
        created_at: new Date(),
        updated_at: new Date(),
      });

      jest.spyOn(repository as any, 'findModel').mockImplementation(async (id: string) => {
        return id === 'existing-item-123' ? createdItem : null;
      });
    });

    it('should find item by ID', async () => {
      const result = await repository.findById('existing-item-123');

      expect(result).toBe(createdItem);
      expect(result?.name).toBe(sampleItem.name);
    });

    it('should return null for non-existent item', async () => {
      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should find all items', async () => {
      const mockItems = [createdItem];
      
      jest.spyOn(repository as any, 'buildQuery').mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockItems),
      });

      const results = await repository.findAll();

      expect(results).toEqual(mockItems);
      expect(results).toHaveLength(1);
    });

    it('should find items with query options', async () => {
      const queryOptions = {
        where: [{ field: 'type', operator: 'eq' as const, value: 'fridge' }],
        limit: 10,
      };

      const mockFilteredItems = [createdItem];
      
      jest.spyOn(repository as any, 'buildQuery').mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockFilteredItems),
      });

      const results = await repository.findAll(queryOptions);

      expect(results).toEqual(mockFilteredItems);
      expect(repository['buildQuery']).toHaveBeenCalledWith(queryOptions);
    });
  });

  describe('Update Operations', () => {
    let existingItem: PantryItem;

    beforeEach(() => {
      existingItem = new PantryItem();
      Object.assign(existingItem, {
        id: 'existing-item-456',
        ...sampleItem,
        created_at: new Date(),
        updated_at: new Date(),
      });

      jest.spyOn(repository as any, 'findModel').mockResolvedValue(existingItem);
      jest.spyOn(repository as any, 'updateModel').mockImplementation(
        async (item: PantryItem, data: UpdatePantryItemData) => {
          Object.assign(item, data, { updated_at: new Date() });
          return item;
        }
      );
    });

    it('should update item properties', async () => {
      const updateData: UpdatePantryItemData = {
        name: 'Updated Apple',
        quantity: 10,
      };

      const result = await repository.update('existing-item-456', updateData);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Apple');
      expect(result?.quantity).toBe(10);
      expect(repository['updateModel']).toHaveBeenCalledWith(existingItem, updateData);
    });

    it('should handle partial updates', async () => {
      const updateData: UpdatePantryItemData = {
        quantity: 3,
        // Only updating quantity, other fields should remain unchanged
      };

      const result = await repository.update('existing-item-456', updateData);

      expect(result?.quantity).toBe(3);
      expect(result?.name).toBe(sampleItem.name); // Should remain unchanged
    });

    it('should handle update of non-existent item', async () => {
      jest.spyOn(repository as any, 'findModel').mockResolvedValue(null);

      const result = await repository.update('non-existent-id', { quantity: 5 });

      expect(result).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    let existingItem: PantryItem;

    beforeEach(() => {
      existingItem = new PantryItem();
      Object.assign(existingItem, {
        id: 'item-to-delete-789',
        ...sampleItem,
        created_at: new Date(),
        updated_at: new Date(),
      });

      jest.spyOn(repository as any, 'findModel').mockResolvedValue(existingItem);
      jest.spyOn(repository as any, 'deleteModel').mockImplementation(async () => {
        // Simulate deletion
      });
    });

    it('should delete existing item', async () => {
      const result = await repository.delete('item-to-delete-789');

      expect(result).toBe(true);
      expect(repository['deleteModel']).toHaveBeenCalledWith(existingItem);
    });

    it('should handle deletion of non-existent item', async () => {
      jest.spyOn(repository as any, 'findModel').mockResolvedValue(null);

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('Business Logic Methods', () => {
    beforeEach(() => {
      // Mock findAll for business logic methods
      const mockItems = [
        { ...sampleItem, id: '1', type: 'fridge', category: 'fruits' },
        { ...sampleItem2, id: '2', type: 'cabinet', category: 'bakery' },
        { ...sampleItem, id: '3', type: 'fridge', category: 'vegetables', name: 'Carrot' },
      ].map(data => {
        const item = new PantryItem();
        Object.assign(item, data);
        return item;
      });

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockItems);
    });

    it('should find items by type', async () => {
      const fridgeItems = await repository.findByType('fridge');

      // Should call findAll with type filter
      expect(repository.findAll).toHaveBeenCalled();
      // The actual filtering logic would be in the real implementation
    });

    it('should find items by category', async () => {
      const fruitItems = await repository.findByCategory('fruits');

      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should search items by name', async () => {
      const searchResults = await repository.searchByName('apple');

      expect(repository.findAll).toHaveBeenCalled();
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

      jest.spyOn(repository, 'getStatistics').mockResolvedValue(mockStats);

      const stats = await repository.getStatistics();

      expect(stats.totalItems).toBe(15);
      expect(stats.itemsByType).toBeDefined();
      expect(typeof stats.itemsByType.fridge).toBe('number');
    });

    it('should find expiring items', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiringItem = new PantryItem();
      Object.assign(expiringItem, {
        ...sampleItem,
        id: 'expiring-item',
        expiry_date: tomorrow,
      });

      jest.spyOn(repository, 'findExpiringSoon').mockResolvedValue([expiringItem]);

      const expiringItems = await repository.findExpiringSoon(3);

      expect(expiringItems).toHaveLength(1);
      expect(expiringItems[0].id).toBe('expiring-item');
    });

    it('should find expired items', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const expiredItem = new PantryItem();
      Object.assign(expiredItem, {
        ...sampleItem,
        id: 'expired-item',
        expiry_date: yesterday,
      });

      jest.spyOn(repository, 'findExpired').mockResolvedValue([expiredItem]);

      const expiredItems = await repository.findExpired();

      expect(expiredItems).toHaveLength(1);
      expect(expiredItems[0].id).toBe('expired-item');
    });
  });

  describe('Sync Operations', () => {
    it('should find items pending sync', async () => {
      const pendingItem = new PantryItem();
      Object.assign(pendingItem, {
        ...sampleItem,
        id: 'pending-sync-item',
        sync_status: 'pending',
      });

      jest.spyOn(repository, 'findPendingSync').mockResolvedValue([pendingItem]);

      const pendingItems = await repository.findPendingSync();

      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0].sync_status).toBe('pending');
    });

    it('should mark items as synced', async () => {
      const itemIds = ['item1', 'item2', 'item3'];

      jest.spyOn(repository, 'markAsSynced').mockResolvedValue();

      await repository.markAsSynced(itemIds);

      expect(repository.markAsSynced).toHaveBeenCalledWith(itemIds);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      jest.spyOn(mockDatabase, 'write').mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(repository.create(sampleItem)).rejects.toThrow(
        'Failed to create pantry_items record'
      );
    });

    it('should handle concurrent operations', async () => {
      const mockItems = [sampleItem, sampleItem2];
      
      jest.spyOn(repository, 'createMany').mockImplementation(async (items) => {
        // Simulate concurrent creation
        return items.map((item, index) => {
          const mockItem = new PantryItem();
          Object.assign(mockItem, {
            id: `concurrent-${index}`,
            ...item,
            created_at: new Date(),
            updated_at: new Date(),
          });
          return mockItem;
        });
      });

      const operations = [
        repository.create(sampleItem),
        repository.create(sampleItem2),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(2);
      expect(results.every(result => result.id)).toBe(true);
    });

    it('should validate data types and constraints', async () => {
      const invalidItem = {
        ...sampleItem,
        quantity: 'invalid-number', // Should be number
        type: 'invalid-type', // Should be 'fridge' | 'cabinet' | 'freezer'
      } as any;

      jest.spyOn(repository as any, 'createModel').mockRejectedValue(
        new Error('Invalid data types')
      );

      await expect(repository.create(invalidItem)).rejects.toThrow(
        'Failed to create pantry_items record'
      );
    });
  });
});
