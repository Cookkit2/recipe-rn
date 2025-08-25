/**
 * WatermelonDB Import Verification Test
 * 
 * Jest test to verify WatermelonDB imports work correctly
 */

import { Database } from '@nozbe/watermelondb';
import { appSchema, tableSchema } from '@nozbe/watermelondb';

describe('WatermelonDB Imports', () => {
  test('should import Database class successfully', () => {
    expect(Database).toBeDefined();
    expect(typeof Database).toBe('function');
  });

  test('should import appSchema function successfully', () => {
    expect(appSchema).toBeDefined();
    expect(typeof appSchema).toBe('function');
  });

  test('should import tableSchema function successfully', () => {
    expect(tableSchema).toBeDefined();
    expect(typeof tableSchema).toBe('function');
  });

  test('should be able to create a basic schema', () => {
    const testSchema = appSchema({
      version: 1,
      tables: [
        tableSchema({
          name: 'test_table',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'created_at', type: 'number' }
          ]
        })
      ]
    });

    expect(testSchema).toBeDefined();
    expect(testSchema.version).toBe(1);
    expect(testSchema.tables).toBeDefined();
    expect(Object.keys(testSchema.tables)).toHaveLength(1);
    expect(testSchema.tables.test_table).toBeDefined();
  });
});
