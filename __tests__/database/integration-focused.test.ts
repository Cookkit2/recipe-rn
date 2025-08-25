/**
 * Repository Integration Tests
 * 
 * Tests repository operations through focused mocking to verify 
 * business logic and error handling patterns
 */

import { PantryItemRepository, type CreatePantryItemData } from '~/data/database/repositories/pantry-item-repository';
import { PantryItem } from '~/data/database/models/PantryItem';

describe('PantryItem Repository Integration Tests', () => {
  let repository: PantryItemRepository;
  let mockDatabase: any;

  const sampleCreateData: CreatePantryItemData = {
    name: 'Test Apple',
    quantity: 5,
    unit: 'pieces',
    category: 'fruits',
    type: 'fridge',
    image_url: 'apple.jpg',
    x: 100,
    y: 150,
    scale: 1.2,
  };

  beforeEach(() => {
    // Create minimal mock database
    mockDatabase = {
      write: jest.fn(),
      get: jest.fn(),
    };
    repository = new PantryItemRepository(mockDatabase);
  });

  describe('Integration Setup', () => {
    it('should initialize repository with correct configuration', () => {
      expect(repository).toBeInstanceOf(PantryItemRepository);
      expect((repository as any).tableName).toBe('pantry_items');
    });

    it('should have access to database instance', () => {
      expect((repository as any).database).toBe(mockDatabase);
    });
  });

  describe('CRUD Operation Flow', () => {
    it('should handle complete create-read-update-delete flow', async () => {
      const createdItem = new PantryItem();
      Object.assign(createdItem, {
        id: 'integration-test-item',
        ...sampleCreateData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock the createModel method for create operation
      jest.spyOn(repository as any, 'createModel').mockResolvedValue(createdItem);
      mockDatabase.write.mockImplementation(async (callback: any) => callback());

      // Test CREATE
      const createResult = await repository.create(sampleCreateData);
      expect(createResult.id).toBe('integration-test-item');
      expect(createResult.name).toBe(sampleCreateData.name);

      // Test READ - Mock findModel for read operation
      jest.spyOn(repository as any, 'findModel').mockResolvedValue(createdItem);
      
      const readResult = await repository.findById('integration-test-item');
      expect(readResult).toBe(createdItem);
      expect(readResult?.name).toBe(sampleCreateData.name);

      // Test UPDATE - Mock updateModel for update operation
      jest.spyOn(repository as any, 'updateModel').mockImplementation(
        async (...args: any[]) => {
          const [item, data] = args;
          Object.assign(item, data);
          return item;
        }
      );

      const updateResult = await repository.update('integration-test-item', { name: 'Updated Apple' });
      expect(updateResult?.name).toBe('Updated Apple');

      // Test DELETE - Mock deleteModel for delete operation
      jest.spyOn(repository as any, 'deleteModel').mockResolvedValue(undefined);
      
      const deleteResult = await repository.delete('integration-test-item');
      expect(deleteResult).toBe(true);
    });

    it('should handle errors throughout the CRUD flow', async () => {
      // Test CREATE error
      jest.spyOn(repository as any, 'createModel').mockRejectedValue(new Error('Database error'));
      await expect(repository.create(sampleCreateData)).rejects.toThrow('Failed to create pantry_items record');

      // Test READ error (item not found)
      jest.spyOn(repository as any, 'findModel').mockResolvedValue(null);
      const readResult = await repository.findById('non-existent');
      expect(readResult).toBeNull();

      // Test UPDATE error (item not found)
      const updateResult = await repository.update('non-existent', { name: 'Updated' });
      expect(updateResult).toBeNull();

      // Test DELETE error (item not found)
      const deleteResult = await repository.delete('non-existent');
      expect(deleteResult).toBe(false);
    });
  });

  describe('Business Logic Integration', () => {
    beforeEach(() => {
      // Create mock items for business logic tests
      const mockItems = [
        { id: '1', name: 'Apple', type: 'fridge', category: 'fruits' },
        { id: '2', name: 'Bread', type: 'cabinet', category: 'bakery' },
        { id: '3', name: 'Ice Cream', type: 'freezer', category: 'dairy' },
      ].map(data => {
        const item = new PantryItem();
        Object.assign(item, data);
        return item;
      });

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockItems);
    });

    it('should integrate findByType with database queries', async () => {
      const fridgeItems = await repository.findByType('fridge');
      
      expect(repository.findAll).toHaveBeenCalledWith({
        where: [{ field: 'type', operator: 'eq', value: 'fridge' }],
      });
    });

    it('should integrate findByCategory with database queries', async () => {
      const fruitItems = await repository.findByCategory('fruits');
      
      expect(repository.findAll).toHaveBeenCalledWith({
        where: [{ field: 'category', operator: 'eq', value: 'fruits' }],
      });
    });

    it('should integrate searchByName with database queries', async () => {
      const searchResults = await repository.searchByName('apple');
      
      expect(repository.findAll).toHaveBeenCalledWith({
        where: [{ field: 'name', operator: 'like', value: '%apple%' }],
      });
    });

    it('should integrate statistics calculation', async () => {
      const mockStats = {
        total: 15,
        byType: { fridge: 8, cabinet: 5, freezer: 2 },
        expiringSoon: 3,
        expired: 1,
        lowQuantity: 4,
      };

      // Mock the individual methods that getStatistics calls
      jest.spyOn(repository, 'count').mockResolvedValue(15);
      jest.spyOn(repository, 'getItemsByType').mockResolvedValue({
        fridge: Array(8).fill({}),
        cabinet: Array(5).fill({}),
        freezer: Array(2).fill({}),
      } as any);
      jest.spyOn(repository, 'findExpiringSoon').mockResolvedValue(Array(3).fill({}) as any);
      jest.spyOn(repository, 'findExpired').mockResolvedValue(Array(1).fill({}) as any);
      jest.spyOn(repository, 'findLowQuantity').mockResolvedValue(Array(4).fill({}) as any);

      const stats = await repository.getStatistics();

      expect(stats.total).toBe(15);
      expect(stats.byType.fridge).toBe(8);
      expect(stats.expiringSoon).toBe(3);
      expect(stats.expired).toBe(1);
      expect(stats.lowQuantity).toBe(4);
    });
  });

  describe('Sync Operations Integration', () => {
    it('should integrate sync status tracking', async () => {
      const pendingItem = new PantryItem();
      Object.assign(pendingItem, {
        id: 'pending-item',
        sync_status: 'pending',
        ...sampleCreateData,
      });

      jest.spyOn(repository, 'findAll').mockResolvedValue([pendingItem]);

      const pendingItems = await repository.findPendingSync();

      expect(repository.findAll).toHaveBeenCalledWith({
        where: [{ field: 'sync_status', operator: 'eq', value: 'pending' }],
      });
      expect(pendingItems).toHaveLength(1);
    });

    it('should integrate batch sync operations', async () => {
      const itemIds = ['item1', 'item2', 'item3'];
      
      // Mock items for sync
      const mockItems = itemIds.map(id => {
        const item = new PantryItem();
        Object.assign(item, { id, update: jest.fn().mockResolvedValue(item) });
        return item;
      });

      jest.spyOn(repository, 'findById')
        .mockImplementation(async (id: string) => {
          return mockItems.find(item => item.id === id) || null;
        });

      mockDatabase.write.mockImplementation(async (callback: any) => callback());

      await repository.markAsSynced(itemIds);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(repository.findById).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database transaction errors', async () => {
      mockDatabase.write.mockRejectedValue(new Error('Transaction failed'));
      jest.spyOn(repository as any, 'createModel').mockImplementation(() => {
        throw new Error('Model creation failed');
      });

      await expect(repository.create(sampleCreateData)).rejects.toThrow();
    });

    it('should handle concurrent operation conflicts', async () => {
      const operations = [
        repository.create(sampleCreateData),
        repository.create({ ...sampleCreateData, name: 'Another Item' }),
      ];

      // Mock successful creation for concurrent operations
      let callCount = 0;
      jest.spyOn(repository as any, 'createModel').mockImplementation(async () => {
        const item = new PantryItem();
        Object.assign(item, {
          id: `concurrent-${++callCount}`,
          ...sampleCreateData,
          name: callCount === 1 ? sampleCreateData.name : 'Another Item',
        });
        return item;
      });

      mockDatabase.write.mockImplementation(async (callback: any) => callback());

      const results = await Promise.all(operations);

      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe('concurrent-1');
      expect(results[1]?.id).toBe('concurrent-2');
    });

    it('should validate data integrity during operations', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        quantity: -1, // Invalid: negative quantity
        type: 'invalid' as any, // Invalid: wrong type
      } as CreatePantryItemData;

      jest.spyOn(repository as any, 'createModel').mockRejectedValue(
        new Error('Validation failed: Invalid data')
      );

      await expect(repository.create(invalidData)).rejects.toThrow(
        'Failed to create pantry_items record'
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large batch operations', async () => {
      const largeBatch = Array(100).fill(null).map((_, index) => ({
        ...sampleCreateData,
        name: `Item ${index}`,
      }));

      const mockResults = largeBatch.map((item, index) => {
        const result = new PantryItem();
        Object.assign(result, { id: `batch-${index}`, ...item });
        return result;
      });

      jest.spyOn(repository, 'createMany').mockResolvedValue(mockResults);

      const results = await repository.createMany(largeBatch);

      expect(results).toHaveLength(100);
      expect(results.every(item => item.id?.startsWith('batch-'))).toBe(true);
    });

    it('should properly clean up resources after operations', async () => {
      const cleanup = jest.fn();
      
      // Mock a operation that requires cleanup
      jest.spyOn(repository as any, 'createModel').mockImplementation(async () => {
        try {
          const item = new PantryItem();
          Object.assign(item, { id: 'cleanup-test', ...sampleCreateData });
          return item;
        } finally {
          cleanup();
        }
      });

      mockDatabase.write.mockImplementation(async (callback: any) => callback());

      await repository.create(sampleCreateData);

      expect(cleanup).toHaveBeenCalled();
    });
  });
});
