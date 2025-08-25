/**
 * Database Integration Tests with Temporary Database
 * 
 * Creates a real WatermelonDB instance for testing, then cleans up
 * Tests all CRUD operations with actual database persistence
 */

import Database from '@nozbe/watermelondb/Database';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '~/data/database/schema';
import { PantryItem } from '~/data/database/models/PantryItem';
import { Recipe } from '~/data/database/models/Recipe';
import { PantryItemRepository } from '~/data/database/repositories/pantry-item-repository';
import type { CreatePantryItemData } from '~/data/database/repositories/pantry-item-repository';

// Test database configuration
const createTestDatabase = () => {
  const adapter = new SQLiteAdapter({
    schema,
    dbName: `test_recipe_app_${Date.now()}_${Math.random().toString(36).substring(7)}.db`,
    migrations: [],
  });

  return new Database({
    adapter,
    modelClasses: [PantryItem, Recipe],
    actionsEnabled: true,
  });
};

describe('Database Integration Tests (Real Database)', () => {
  let database: Database;
  let pantryRepo: PantryItemRepository;
  
  // Test data
  const samplePantryItem: CreatePantryItemData = {
    name: 'Test Tomato',
    quantity: 5,
    unit: 'pieces',
    category: 'vegetables',
    type: 'fridge',
    image_url: 'tomato.jpg',
    x: 100,
    y: 200,
    scale: 1.2,
  };

  const samplePantryItem2: CreatePantryItemData = {
    name: 'Test Bread',
    quantity: 1,
    unit: 'loaf',
    category: 'bakery',
    type: 'cabinet',
    image_url: 'bread.jpg',
    x: 150,
    y: 250,
    scale: 0.8,
  };

  beforeEach(async () => {
    // Create fresh database for each test
    database = createTestDatabase();
    pantryRepo = new PantryItemRepository(database);
    
    // Wait for database to be ready
    await database.adapter.underlyingAdapter.setUpWithSchema(
      database.adapter.underlyingAdapter.dbName,
      schema,
      1
    );
  });

  afterEach(async () => {
    // Clean up database after each test
    if (database) {
      try {
        // Delete all data
        await database.write(async () => {
          const collections = database.collections.map.values();
          for (const collection of collections) {
            const allRecords = await collection.query().fetch();
            await Promise.all(allRecords.map(record => record.destroyPermanently()));
          }
        });
        
        // Close database connection
        database.adapter.underlyingAdapter.close?.();
      } catch (error) {
        console.warn('Error cleaning up test database:', error);
      }
    }
  });

  describe('Database Setup and Teardown', () => {
    it('should create and initialize database successfully', () => {
      expect(database).toBeDefined();
      expect(database.collections).toBeDefined();
      expect(pantryRepo).toBeDefined();
    });

    it('should have empty collections initially', async () => {
      const items = await database.collections.get('pantry_items').query().fetch();
      expect(items).toHaveLength(0);
    });
  });

  describe('CRUD Operations', () => {
    describe('Create Operations', () => {
      it('should create a single pantry item', async () => {
        const created = await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            item.name = samplePantryItem.name;
            item.quantity = samplePantryItem.quantity;
            item.unit = samplePantryItem.unit;
            item.category = samplePantryItem.category;
            item.type = samplePantryItem.type;
            item.image_url = samplePantryItem.image_url;
            item.x = samplePantryItem.x;
            item.y = samplePantryItem.y;
            item.scale = samplePantryItem.scale;
          });
        });

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.name).toBe(samplePantryItem.name);
        expect(created.quantity).toBe(samplePantryItem.quantity);
        expect(created.type).toBe(samplePantryItem.type);
      });

      it('should create multiple pantry items', async () => {
        const items = await database.write(async () => {
          const item1 = await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
          
          const item2 = await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem2);
          });
          
          return [item1, item2];
        });

        expect(items).toHaveLength(2);
        expect(items[0].name).toBe(samplePantryItem.name);
        expect(items[1].name).toBe(samplePantryItem2.name);
      });

      it('should set timestamps automatically', async () => {
        const created = await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
        });

        expect(created.createdAt).toBeDefined();
        expect(created.updatedAt).toBeDefined();
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('Read Operations', () => {
      let createdItem: any;

      beforeEach(async () => {
        createdItem = await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
        });
      });

      it('should find item by ID', async () => {
        const found = await database.collections.get('pantry_items').find(createdItem.id);
        
        expect(found).toBeDefined();
        expect(found.id).toBe(createdItem.id);
        expect(found.name).toBe(samplePantryItem.name);
      });

      it('should fetch all items', async () => {
        // Add another item
        await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem2);
          });
        });

        const allItems = await database.collections.get('pantry_items').query().fetch();
        
        expect(allItems).toHaveLength(2);
        expect(allItems.map(item => item.name)).toContain(samplePantryItem.name);
        expect(allItems.map(item => item.name)).toContain(samplePantryItem2.name);
      });

      it('should query items with conditions', async () => {
        // Add items with different types
        await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem2);
          });
        });

        const fridgeItems = await database.collections.get('pantry_items')
          .query(database.adapter.schema.Q.where('type', 'fridge'))
          .fetch();
        
        const cabinetItems = await database.collections.get('pantry_items')
          .query(database.adapter.schema.Q.where('type', 'cabinet'))
          .fetch();

        expect(fridgeItems).toHaveLength(1);
        expect(fridgeItems[0].type).toBe('fridge');
        expect(cabinetItems).toHaveLength(1);
        expect(cabinetItems[0].type).toBe('cabinet');
      });
    });

    describe('Update Operations', () => {
      let createdItem: any;

      beforeEach(async () => {
        createdItem = await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
        });
      });

      it('should update item properties', async () => {
        const originalUpdatedAt = createdItem.updatedAt;
        
        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const updated = await database.write(async () => {
          return await createdItem.update((item: any) => {
            item.name = 'Updated Tomato';
            item.quantity = 10;
          });
        });

        expect(updated.name).toBe('Updated Tomato');
        expect(updated.quantity).toBe(10);
        expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        
        // Verify persistence
        const refetched = await database.collections.get('pantry_items').find(createdItem.id);
        expect(refetched.name).toBe('Updated Tomato');
        expect(refetched.quantity).toBe(10);
      });

      it('should update multiple properties at once', async () => {
        const updated = await database.write(async () => {
          return await createdItem.update((item: any) => {
            item.name = 'Updated Item';
            item.quantity = 15;
            item.category = 'updated-category';
            item.type = 'freezer';
          });
        });

        expect(updated.name).toBe('Updated Item');
        expect(updated.quantity).toBe(15);
        expect(updated.category).toBe('updated-category');
        expect(updated.type).toBe('freezer');
      });
    });

    describe('Delete Operations', () => {
      let createdItem: any;

      beforeEach(async () => {
        createdItem = await database.write(async () => {
          return await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
        });
      });

      it('should soft delete item (markAsDeleted)', async () => {
        await database.write(async () => {
          await createdItem.markAsDeleted();
        });

        // Item should be marked as deleted but still exist
        const refetched = await database.collections.get('pantry_items').find(createdItem.id);
        expect(refetched._isDeleted).toBe(true);
      });

      it('should permanently delete item', async () => {
        await database.write(async () => {
          await createdItem.destroyPermanently();
        });

        // Item should not exist anymore
        await expect(
          database.collections.get('pantry_items').find(createdItem.id)
        ).rejects.toThrow();
      });

      it('should handle deleting non-existent item gracefully', async () => {
        const fakeId = 'non-existent-id';
        
        await expect(
          database.collections.get('pantry_items').find(fakeId)
        ).rejects.toThrow();
      });
    });
  });

  describe('Advanced Query Operations', () => {
    beforeEach(async () => {
      // Create test data set
      await database.write(async () => {
        const items = [
          { ...samplePantryItem, name: 'Apple', category: 'fruits', quantity: 5 },
          { ...samplePantryItem, name: 'Banana', category: 'fruits', quantity: 3 },
          { ...samplePantryItem, name: 'Carrot', category: 'vegetables', quantity: 8 },
          { ...samplePantryItem2, name: 'Milk', category: 'dairy', quantity: 1 },
          { ...samplePantryItem2, name: 'Cheese', category: 'dairy', quantity: 2 },
        ];

        for (const itemData of items) {
          await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, itemData);
          });
        }
      });
    });

    it('should query by category', async () => {
      const fruits = await database.collections.get('pantry_items')
        .query(database.adapter.schema.Q.where('category', 'fruits'))
        .fetch();
      
      expect(fruits).toHaveLength(2);
      expect(fruits.map(item => item.name).sort()).toEqual(['Apple', 'Banana']);
    });

    it('should query with multiple conditions', async () => {
      const fridgeFruits = await database.collections.get('pantry_items')
        .query(
          database.adapter.schema.Q.where('type', 'fridge'),
          database.adapter.schema.Q.where('category', 'fruits')
        )
        .fetch();
      
      expect(fridgeFruits).toHaveLength(2);
      expect(fridgeFruits.every(item => item.type === 'fridge')).toBe(true);
      expect(fridgeFruits.every(item => item.category === 'fruits')).toBe(true);
    });

    it('should query with sorting', async () => {
      const itemsSortedByName = await database.collections.get('pantry_items')
        .query(database.adapter.schema.Q.sortBy('name', database.adapter.schema.Q.asc))
        .fetch();
      
      const names = itemsSortedByName.map(item => item.name);
      expect(names).toEqual(['Apple', 'Banana', 'Carrot', 'Cheese', 'Milk']);
    });

    it('should query with quantity filtering', async () => {
      const lowQuantityItems = await database.collections.get('pantry_items')
        .query(database.adapter.schema.Q.where('quantity', database.adapter.schema.Q.lte(3)))
        .fetch();
      
      expect(lowQuantityItems.length).toBeGreaterThanOrEqual(3);
      expect(lowQuantityItems.every(item => item.quantity <= 3)).toBe(true);
    });
  });

  describe('Transaction Operations', () => {
    it('should handle successful transactions', async () => {
      const results = await database.write(async () => {
        const item1 = await database.collections.get('pantry_items').create((item: any) => {
          Object.assign(item, samplePantryItem);
        });
        
        const item2 = await database.collections.get('pantry_items').create((item: any) => {
          Object.assign(item, samplePantryItem2);
        });
        
        return [item1, item2];
      });

      expect(results).toHaveLength(2);
      
      // Verify both items were persisted
      const allItems = await database.collections.get('pantry_items').query().fetch();
      expect(allItems).toHaveLength(2);
    });

    it('should rollback failed transactions', async () => {
      await expect(
        database.write(async () => {
          // Create first item (should succeed)
          await database.collections.get('pantry_items').create((item: any) => {
            Object.assign(item, samplePantryItem);
          });
          
          // Force an error
          throw new Error('Simulated transaction failure');
        })
      ).rejects.toThrow('Simulated transaction failure');

      // Verify no items were persisted due to rollback
      const allItems = await database.collections.get('pantry_items').query().fetch();
      expect(allItems).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      await database.write(async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            database.collections.get('pantry_items').create((item: any) => {
              Object.assign(item, {
                ...samplePantryItem,
                name: `Test Item ${i}`,
                quantity: i,
              });
            })
          );
        }
        await Promise.all(promises);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all items were created
      const allItems = await database.collections.get('pantry_items').query().fetch();
      expect(allItems).toHaveLength(100);
    });

    it('should query large datasets efficiently', async () => {
      // Create a larger dataset
      await database.write(async () => {
        const promises = [];
        for (let i = 0; i < 500; i++) {
          promises.push(
            database.collections.get('pantry_items').create((item: any) => {
              Object.assign(item, {
                ...samplePantryItem,
                name: `Item ${i}`,
                category: i % 2 === 0 ? 'even' : 'odd',
                quantity: i,
              });
            })
          );
        }
        await Promise.all(promises);
      });

      const startTime = Date.now();
      
      // Complex query
      const results = await database.collections.get('pantry_items')
        .query(
          database.adapter.schema.Q.where('category', 'even'),
          database.adapter.schema.Q.where('quantity', database.adapter.schema.Q.gte(100)),
          database.adapter.schema.Q.sortBy('quantity', database.adapter.schema.Q.desc)
        )
        .fetch();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1 second
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(item => item.category === 'even')).toBe(true);
      expect(results.every(item => item.quantity >= 100)).toBe(true);
    });
  });
});
