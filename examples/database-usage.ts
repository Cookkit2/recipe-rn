/**
 * Database Usage Examples
 * 
 * Examples showing how to use the SQL database facade system
 * with WatermelonDB for offline-first applications
 */

import {
  databaseFacade,
  initializeDatabase,
  createWatermelonDB,
  getDatabaseStatus,
  migrateFromKeyValueStorage,
} from '~/data/database';

import type {
  CreatePantryItemData,
  UpdatePantryItemData,
} from '~/data/database';

// ===============================================
// Basic Usage Examples
// ===============================================

export async function basicDatabaseUsage() {
  console.log('=== Basic Database Usage ===');

  // Initialize the database
  await initializeDatabase('development');

  // Check if database is ready
  console.log('Database ready:', databaseFacade.isInitialized);

  // Get database information
  const info = databaseFacade.getInfo();
  console.log('Database info:', info);

  // Get database status
  const status = await getDatabaseStatus();
  console.log('Database status:', status);
}

// ===============================================
// PantryItem Repository Examples
// ===============================================

export async function pantryItemExamples() {
  console.log('=== PantryItem Repository Examples ===');

  // Ensure database is initialized
  if (!databaseFacade.isInitialized) {
    await initializeDatabase('development');
  }

  const pantryRepo = databaseFacade.pantryItems;

  // Create a new pantry item
  const newItem: CreatePantryItemData = {
    name: 'Fresh Apples',
    quantity: 10,
    unit: 'pieces',
    category: 'Fruit',
    type: 'fridge',
    image_url: 'apples.jpg',
    x: 100,
    y: 200,
    scale: 1.2,
    expiry_date: new Date('2025-09-15'),
  };

  const createdItem = await pantryRepo.create(newItem);
  console.log('Created item:', createdItem.toPlainObject());

  // Find item by ID
  const foundItem = await pantryRepo.findById(createdItem.id);
  console.log('Found item:', foundItem?.toPlainObject());

  // Update the item
  const updateData: UpdatePantryItemData = {
    quantity: 8,
    category: 'Organic Fruit',
  };

  const updatedItem = await pantryRepo.update(createdItem.id, updateData);
  console.log('Updated item:', updatedItem.toPlainObject());

  // Search for items
  const appleItems = await pantryRepo.searchByName('Apple');
  console.log('Apple items:', appleItems.map(item => item.toPlainObject()));

  // Find items by type
  const fridgeItems = await pantryRepo.findByType('fridge');
  console.log('Fridge items:', fridgeItems.length);

  // Find expiring items
  const expiringSoon = await pantryRepo.findExpiringSoon(7); // Within 7 days
  console.log('Items expiring soon:', expiringSoon.length);

  // Get statistics
  const stats = await pantryRepo.getStatistics();
  console.log('Pantry statistics:', stats);
}

// ===============================================
// Advanced Query Examples
// ===============================================

export async function advancedQueryExamples() {
  console.log('=== Advanced Query Examples ===');

  if (!databaseFacade.isInitialized) {
    await initializeDatabase('development');
  }

  const pantryRepo = databaseFacade.pantryItems;

  // Create sample data
  const sampleItems: CreatePantryItemData[] = [
    {
      name: 'Red Apples',
      quantity: 5,
      unit: 'pieces',
      category: 'Fruit',
      type: 'fridge',
      image_url: 'red-apples.jpg',
      x: 0,
      y: 0,
      scale: 1,
      expiry_date: new Date('2025-09-10'),
    },
    {
      name: 'Canned Tomatoes',
      quantity: 3,
      unit: 'cans',
      category: 'Vegetables',
      type: 'cabinet',
      image_url: 'tomatoes.jpg',
      x: 0,
      y: 0,
      scale: 1,
      expiry_date: new Date('2026-01-15'),
    },
    {
      name: 'Frozen Berries',
      quantity: 1,
      unit: 'bag',
      category: 'Fruit',
      type: 'freezer',
      image_url: 'berries.jpg',
      x: 0,
      y: 0,
      scale: 1,
    },
  ];

  await pantryRepo.createMany(sampleItems);

  // Custom queries using the base repository methods
  const fruitItems = await pantryRepo.findAll({
    where: [{ field: 'category', operator: 'eq', value: 'Fruit' }],
    orderBy: [{ field: 'name', direction: 'asc' }],
  });
  console.log('Fruit items:', fruitItems.map(item => item.name));

  // Pagination example
  const paginatedResults = await pantryRepo.findPaginated(
    { page: 1, pageSize: 2 },
    { orderBy: [{ field: 'created_at', direction: 'desc' }] }
  );
  console.log('Paginated results:', {
    page: paginatedResults.pagination.page,
    total: paginatedResults.pagination.total,
    items: paginatedResults.data.map(item => item.name),
  });

  // Count operations
  const totalItems = await pantryRepo.count();
  const fruitCount = await pantryRepo.count({
    where: [{ field: 'category', operator: 'eq', value: 'Fruit' }],
  });
  console.log(`Total items: ${totalItems}, Fruit items: ${fruitCount}`);

  // Group by type
  const itemsByType = await pantryRepo.getItemsByType();
  console.log('Items by type:', {
    fridge: itemsByType.fridge.length,
    cabinet: itemsByType.cabinet.length,
    freezer: itemsByType.freezer.length,
  });
}

// ===============================================
// Transaction Examples
// ===============================================

export async function transactionExamples() {
  console.log('=== Transaction Examples ===');

  if (!databaseFacade.isInitialized) {
    await initializeDatabase('development');
  }

  const pantryRepo = databaseFacade.pantryItems;

  // Example: Add multiple related items in a transaction
  const shoppingList = await databaseFacade.transaction(async () => {
    const milk = await pantryRepo.create({
      name: 'Milk',
      quantity: 1,
      unit: 'bottle',
      category: 'Dairy',
      type: 'fridge',
      image_url: 'milk.jpg',
      x: 0,
      y: 0,
      scale: 1,
      expiry_date: new Date('2025-09-01'),
    });

    const bread = await pantryRepo.create({
      name: 'Whole Wheat Bread',
      quantity: 1,
      unit: 'loaf',
      category: 'Bakery',
      type: 'cabinet',
      image_url: 'bread.jpg',
      x: 0,
      y: 0,
      scale: 1,
      expiry_date: new Date('2025-08-25'),
    });

    const eggs = await pantryRepo.create({
      name: 'Free Range Eggs',
      quantity: 12,
      unit: 'pieces',
      category: 'Dairy',
      type: 'fridge',
      image_url: 'eggs.jpg',
      x: 0,
      y: 0,
      scale: 1,
      expiry_date: new Date('2025-09-05'),
    });

    return [milk, bread, eggs];
  });

  console.log('Added shopping list:', shoppingList.map(item => item.name));

  // Example: Recipe preparation (consuming ingredients)
  await databaseFacade.transaction(async () => {
    // Find ingredients for a recipe
    const milkItem = await pantryRepo.findOne({
      where: [{ field: 'name', operator: 'eq', value: 'Milk' }],
    });

    const eggItem = await pantryRepo.findOne({
      where: [{ field: 'name', operator: 'eq', value: 'Free Range Eggs' }],
    });

    // Consume ingredients (decrease quantities)
    if (milkItem) {
      await pantryRepo.consumeItem(milkItem.id, 0.5); // Use half bottle
    }

    if (eggItem) {
      await pantryRepo.consumeItem(eggItem.id, 2); // Use 2 eggs
    }

    console.log('Ingredients consumed for recipe');
  });
}

// ===============================================
// Sync and Offline Examples
// ===============================================

export async function syncExamples() {
  console.log('=== Sync and Offline Examples ===');

  // Initialize database with sync URL
  await createWatermelonDB({
    name: 'recipe_app_sync.db',
    actionsEnabled: true,
    syncUrl: 'https://api.example.com/sync', // Replace with your sync endpoint
  });

  // Set up sync status monitoring
  databaseFacade.onSyncStatusChange((status) => {
    console.log('Sync status changed:', {
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      lastSyncAt: status.lastSyncAt,
      pendingChanges: status.pendingChanges,
      error: status.error,
    });
  });

  const pantryRepo = databaseFacade.pantryItems;

  // Create items that will be marked for sync
  await pantryRepo.create({
    name: 'Sync Test Item',
    quantity: 1,
    unit: 'piece',
    category: 'Test',
    type: 'fridge',
    image_url: 'test.jpg',
    x: 0,
    y: 0,
    scale: 1,
  });

  // Find items that need to be synced
  const pendingSync = await pantryRepo.findPendingSync();
  console.log('Items pending sync:', pendingSync.length);

  // Perform sync (in a real app, this might happen automatically)
  try {
    await databaseFacade.sync();
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// ===============================================
// Migration Examples
// ===============================================

export async function migrationExamples() {
  console.log('=== Migration Examples ===');

  // Example: Migrate from MMKV storage to WatermelonDB
  const existingMMKVData = {
    pantryItems: [
      {
        id: '1',
        name: 'Legacy Apple',
        quantity: 3,
        unit: 'pieces',
        category: 'Fruit',
        type: 'fridge',
        image_url: 'apple.jpg',
        x: 50,
        y: 100,
        scale: 1.1,
        expiry_date: '2025-09-15T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        steps_to_store: [],
      },
      {
        id: '2',
        name: 'Legacy Milk',
        quantity: 1,
        unit: 'bottle',
        category: 'Dairy',
        type: 'fridge',
        image_url: 'milk.jpg',
        x: 25,
        y: 75,
        scale: 1.0,
        expiry_date: '2025-08-30T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        steps_to_store: [],
      },
    ],
  };

  // Perform migration
  await migrateFromKeyValueStorage(existingMMKVData);

  // Verify migration
  const pantryRepo = databaseFacade.pantryItems;
  const migratedItems = await pantryRepo.findAll();
  console.log('Migrated items:', migratedItems.map(item => ({
    name: item.name,
    quantity: item.quantity,
    type: item.type,
  })));
}

// ===============================================
// Error Handling Examples
// ===============================================

export async function errorHandlingExamples() {
  console.log('=== Error Handling Examples ===');

  if (!databaseFacade.isInitialized) {
    await initializeDatabase('development');
  }

  const pantryRepo = databaseFacade.pantryItems;

  try {
    // Try to find a non-existent item
    const nonExistent = await pantryRepo.findById('non-existent-id');
    console.log('Non-existent item:', nonExistent); // Should be null

    // Try to update a non-existent item (this will throw an error)
    await pantryRepo.update('non-existent-id', { name: 'Updated' });
  } catch (error) {
    console.log('Caught expected error:', (error as Error).message);
  }

  try {
    // Try to perform a transaction that fails
    await databaseFacade.transaction(async () => {
      await pantryRepo.create({
        name: 'Transaction Test',
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
      throw new Error('Simulated transaction error');
    });
  } catch (error) {
    console.log('Transaction rolled back:', (error as Error).message);

    // Verify that the item was not created
    const testItems = await pantryRepo.findAll({
      where: [{ field: 'name', operator: 'eq', value: 'Transaction Test' }],
    });
    console.log('Test items after failed transaction:', testItems.length); // Should be 0
  }
}

// ===============================================
// Performance Examples
// ===============================================

export async function performanceExamples() {
  console.log('=== Performance Examples ===');

  if (!databaseFacade.isInitialized) {
    await initializeDatabase('development');
  }

  const pantryRepo = databaseFacade.pantryItems;

  // Batch creation for better performance
  console.log('Creating 100 items in batch...');
  const startTime = Date.now();

  const items: CreatePantryItemData[] = Array.from({ length: 100 }, (_, i) => ({
    name: `Performance Item ${i}`,
    quantity: i + 1,
    unit: 'piece',
    category: 'Performance Test',
    type: 'cabinet',
    image_url: `item${i}.jpg`,
    x: 0,
    y: 0,
    scale: 1,
  }));

  const createdItems = await pantryRepo.createMany(items);
  const endTime = Date.now();

  console.log(`Created ${createdItems.length} items in ${endTime - startTime}ms`);

  // Efficient querying
  console.log('Querying with pagination...');
  const queryStartTime = Date.now();

  const paginatedResults = await pantryRepo.findPaginated(
    { page: 1, pageSize: 20 },
    {
      where: [{ field: 'category', operator: 'eq', value: 'Performance Test' }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    }
  );

  const queryEndTime = Date.now();
  console.log(`Query completed in ${queryEndTime - queryStartTime}ms`);
  console.log(`Found ${paginatedResults.data.length} items (page 1 of ${paginatedResults.pagination.totalPages})`);

  // Cleanup performance test data
  const perfTestItems = await pantryRepo.findAll({
    where: [{ field: 'category', operator: 'eq', value: 'Performance Test' }],
  });
  const cleanupIds = perfTestItems.map(item => item.id);
  await pantryRepo.deleteMany(cleanupIds);
  console.log(`Cleaned up ${cleanupIds.length} performance test items`);
}

// ===============================================
// Main Demo Function
// ===============================================

export async function runAllDatabaseExamples() {
  console.log('🗄️ Starting Database Facade Examples...\n');

  try {
    await basicDatabaseUsage();
    console.log('');

    await pantryItemExamples();
    console.log('');

    await advancedQueryExamples();
    console.log('');

    await transactionExamples();
    console.log('');

    // Note: Sync examples require a real server endpoint
    // await syncExamples();
    // console.log('');

    await migrationExamples();
    console.log('');

    await errorHandlingExamples();
    console.log('');

    await performanceExamples();
    console.log('');

    console.log('✅ All database examples completed!');
  } catch (error) {
    console.error('❌ Database example failed:', error);
  } finally {
    // Cleanup
    if (databaseFacade.isInitialized) {
      await databaseFacade.close();
    }
  }
}

// Uncomment to run examples:
// runAllDatabaseExamples().catch(console.error);
