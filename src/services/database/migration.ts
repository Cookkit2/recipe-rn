import { NativeModules } from 'react-native';

/**
 * Migration system for Recipe-n database
 * Handles version upgrades and schema changes
 */

export interface Migration {
  version: number;
  description: string;
  upSQL: string;
  downSQL: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial database schema',
    upSQL: `
      -- Users table
      ${TABLE_SCHEMAS[TABLES.USERS]}
      -- Recipes table
      ${TABLE_SCHEMAS[TABLES.RECIPES]}
      -- Ingredients table
      ${TABLE_SCHEMAS[TABLES.INGREDIENTS]}
      -- Instructions table
      ${TABLE_SCHEMAS[TABLES.INSTRUCTIONS]}
      -- Tags table
      ${TABLE_SCHEMAS[TABLES.TAGS]}
      -- Recipe tags table
      ${TABLE_SCHEMAS[TABLES.RECIPE_TAGS]}
      -- Meal plan table
      ${TABLE_SCHEMAS[TABLES.MEAL_PLAN]}
      -- Shopping lists table
      ${TABLE_SCHEMAS[TABLES.SHOPPING_LISTS]}
      -- Shopping list items table
      ${TABLE_SCHEMAS[TABLES.SHOPPING_LIST_ITEMS]}
      -- User progress table
      ${TABLE_SCHEMAS[TABLES.USER_PROGRESS]}
      -- Achievements table
      ${TABLE_SCHEMAS[TABLES.ACHIEVEMENTS]}
      -- User achievements table
      ${TABLE_SCHEMAS[TABLES.USER_ACHIEVEMENTS]}
      -- User streaks table
      ${TABLE_SCHEMAS[TABLES.USER_STREAKS]}
      -- Pantry inventory table
      ${TABLE_SCHEMAS[TABLES.PANTRY_INVENTORY]}

      -- Indexes for performance
      ${INDEXES[TABLES.RECIPES].join('\n')}
      ${INDEXES[TABLES.INGREDIENTS].join('\n')}
      ${INDEXES[TABLES.INSTRUCTIONS].join('\n')}
      ${INDEXES[TABLES.MEAL_PLAN].join('\n')}
      ${INDEXES[TABLES.SHOPPING_LISTS].join('\n')}
      ${INDEXES[TABLES.SHOPPING_LIST_ITEMS].join('\n')}
      ${INDEXES[TABLES.USER_PROGRESS].join('\n')}
      ${INDEXES[TABLES.USER_ACHIEVEMENTS].join('\n')}
      ${INDEXES[TABLES.PANTRY_INVENTORY].join('\n')}
      ${INDEXES[TABLES.TAGS].join('\n')}
      ${INDEXES[TABLES.RECIPE_TAGS].join('\n')}
    `,
    downSQL: `
      DROP TABLE IF EXISTS ${TABLES.USERS};
      DROP TABLE IF EXISTS ${TABLES.RECIPES};
      DROP TABLE IF EXISTS ${TABLES.INGREDIENTS};
      DROP TABLE IF EXISTS ${TABLES.INSTRUCTIONS};
      DROP TABLE IF EXISTS ${TABLES.TAGS};
      DROP TABLE IF EXISTS ${TABLES.RECIPE_TAGS};
      DROP TABLE IF EXISTS ${TABLES.MEAL_PLAN};
      DROP TABLE IF EXISTS ${TABLES.SHOPPING_LISTS};
      DROP TABLE IF EXISTS ${TABLES.SHOPPING_LIST_ITEMS};
      DROP TABLE IF EXISTS ${TABLES.USER_PROGRESS};
      DROP TABLE IF EXISTS ${TABLES.ACHIEVEMENTS};
      DROP TABLE IF EXISTS ${TABLES.USER_ACHIEVEMENTS};
      DROP TABLE IF EXISTS ${TABLES.USER_STREAKS};
      DROP TABLE IF EXISTS ${TABLES.PANTRY_INVENTORY};
    `,
  },
  {
    version: 2,
    description: 'Add is_favorite column to recipes',
    upSQL: `
      ALTER TABLE ${TABLES.RECIPES} ADD COLUMN is_favorite BOOLEAN DEFAULT 0;
    `,
    downSQL: `
      ALTER TABLE ${TABLES.RECIPES} DROP COLUMN is_favorite;
    `,
  },
  {
    version: 3,
    description: 'Add meal planning and shopping list tables',
    upSQL: `
      ALTER TABLE ${TABLES.MEAL_PLAN} ADD COLUMN user_id INTEGER DEFAULT NULL;
      ALTER TABLE ${TABLES.MEAL_PLAN} ADD COLUMN recipe_id INTEGER DEFAULT NULL;
      ALTER TABLE ${TABLES.MEAL_PLAN} ADD COLUMN servings INTEGER DEFAULT 1;
      ALTER TABLE ${TABLES.MEAL_PLAN} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `,
    downSQL: `
      ALTER TABLE ${TABLES.MEAL_PLAN} DROP COLUMN user_id;
      ALTER TABLE ${TABLES.MEAL_PLAN} DROP COLUMN recipe_id;
      ALTER TABLE ${TABLES.MEAL_PLAN} DROP COLUMN servings;
      ALTER TABLE ${TABLES.MEAL_PLAN} DROP COLUMN created_at;
    `,
  },
];

/**
 * Initialize database and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Open SQLite database
    const db = NativeModules.SQLite.open({
      name: DATABASE_CONFIG.dbName,
      location: 'default',
      createFromLocation: '~recipen.db',
    });

    // Get current version
    const currentVersion = await getCurrentVersion(db);

    // Run migrations in order
    for (const migration of MIGRATIONS) {
      if (currentVersion < migration.version) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        await db.executeSql(migration.upSQL);
        await db.executeSql(`INSERT INTO schema_versions (version, applied_at) VALUES (${migration.version}, CURRENT_TIMESTAMP)`);
      }
    }

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get current database version
 */
async function getCurrentVersion(db: any): Promise<number> {
  try {
    const result = await db.executeSql('SELECT MAX(version) as version FROM schema_versions');
    return result[0]?.version || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Create schema versions table for tracking migrations
 */
export async function createSchemaVersionsTable(db: any): Promise<void> {
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Rollback to previous version
 */
export async function rollbackDatabase(targetVersion: number): Promise<void> {
  try {
    const db = NativeModules.SQLite.open({
      name: DATABASE_CONFIG.dbName,
      location: 'default',
    });

    // Rollback migrations from current version down to target
    const currentVersion = await getCurrentVersion(db);
    const migrationsToRollback = MIGRATIONS.filter(
      (m) => m.version <= currentVersion && m.version > targetVersion
    );

    for (const migration of migrationsToRollback.reverse()) {
      console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
      await db.executeSql(migration.downSQL);
    }

    console.log('Database rollback complete');
  } catch (error) {
    console.error('Database rollback failed:', error);
    throw error;
  }
}
