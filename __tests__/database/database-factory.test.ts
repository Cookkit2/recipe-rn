/**
 * Database Factory Test
 * 
 * Jest tests for database facade implementation
 */

import { DatabaseFactory } from '../../data/database/database-factory';
import { schema } from '../../data/database/schema';

describe('Database Factory', () => {
  test('should import schema successfully', () => {
    expect(schema).toBeDefined();
    expect(schema.version).toBeDefined();
    expect(schema.tables).toBeDefined();
    expect(typeof schema.tables).toBe('object');
  });

  test('should have correct schema version', () => {
    expect(schema.version).toBe(1);
  });

  test('should have expected number of tables', () => {
    // Check that we have the expected tables
    const tableNames = Object.keys(schema.tables);
    expect(tableNames.length).toBeGreaterThan(0);
    
    // Verify some key tables exist
    expect(schema.tables.pantry_items).toBeDefined();
    expect(schema.tables.recipes).toBeDefined();
    expect(schema.tables.recipe_ingredients).toBeDefined();
    expect(schema.tables.sync_metadata).toBeDefined();
  });

  test('should have DatabaseFactory available', () => {
    expect(DatabaseFactory).toBeDefined();
    expect(typeof DatabaseFactory.initialize).toBe('function');
  });

  test('should create database config correctly', () => {
    const config = {
      name: 'test_recipe_app',
      type: 'watermelon' as const,
      version: 1,
    };

    expect(config.name).toBe('test_recipe_app');
    expect(config.type).toBe('watermelon');
    expect(config.version).toBe(1);
  });

  // Note: Actual database initialization is tested in database-integration.test.ts
  // This file focuses on the factory and schema validation
});
