import { Platform, NativeModules } from 'react-native';

/**
 * SQLite database initialization for Recipe-n
 * Offline-first architecture with cached recipe database
 */

export interface DatabaseConfig {
  dbName: string;
  version: number;
  description: string;
}

export const DATABASE_CONFIG: DatabaseConfig = {
  dbName: 'recipen.db',
  version: 1,
  description: 'Recipe-n mobile app database with offline-first architecture',
};

export const TABLES = {
  USERS: 'users',
  RECIPES: 'recipes',
  INGREDIENTS: 'ingredients',
  INSTRUCTIONS: 'instructions',
  TAGS: 'tags',
  RECIPE_TAGS: 'recipe_tags',
  MEAL_PLAN: 'meal_plan',
  SHOPPING_LISTS: 'shopping_lists',
  SHOPPING_LIST_ITEMS: 'shopping_list_items',
  USER_PROGRESS: 'user_progress',
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  USER_STREAKS: 'user_streaks',
  PANTRY_INVENTORY: 'pantry_inventory',
};

export const TABLE_SCHEMAS = {
  [TABLES.USERS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.USERS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dietary_restrictions TEXT,
      preferences TEXT,
      is_offline_mode BOOLEAN DEFAULT 1
    )
  `,

  [TABLES.RECIPES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RECIPES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      cuisine TEXT,
      difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      prep_time_minutes INTEGER DEFAULT 0,
      cook_time_minutes INTEGER DEFAULT 0,
      total_time_minutes INTEGER,
      servings INTEGER DEFAULT 1,
      is_favorite BOOLEAN DEFAULT 0,
      calories INTEGER,
      source TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  [TABLES.INGREDIENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.INGREDIENTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount TEXT NOT NULL,
      unit TEXT,
      notes TEXT,
      is_substitute BOOLEAN DEFAULT 0,
      original_ingredient_id INTEGER,
      substitution_score INTEGER,
      FOREIGN KEY (recipe_id) REFERENCES ${TABLES.RECIPES}(id)
    )
  `,

  [TABLES.INSTRUCTIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.INSTRUCTIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      instruction_text TEXT NOT NULL,
      estimated_time_minutes INTEGER,
      completion_status TEXT DEFAULT 'pending',
      FOREIGN KEY (recipe_id) REFERENCES ${TABLES.RECIPES}(id)
    )
  `,

  [TABLES.TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TAGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT
    )
  `,

  [TABLES.RECIPE_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RECIPE_TAGS} (
      recipe_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (recipe_id, tag_id),
      FOREIGN KEY (recipe_id) REFERENCES ${TABLES.RECIPES}(id),
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.TAGS}(id)
    )
  `,

  [TABLES.MEAL_PLAN]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.MEAL_PLAN} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_of_week INTEGER CHECK(day_of_week >= 1 AND day_of_week <= 7),
      meal_type TEXT CHECK(meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
      recipe_id INTEGER NOT NULL,
      servings INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id),
      FOREIGN KEY (recipe_id) REFERENCES ${TABLES.RECIPES}(id)
    )
  `,

  [TABLES.SHOPPING_LISTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SHOPPING_LISTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT DEFAULT 'Shopping List',
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id)
    )
  `,

  [TABLES.SHOPPING_LIST_ITEMS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SHOPPING_LIST_ITEMS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopping_list_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      amount TEXT,
      unit TEXT,
      is_purchased BOOLEAN DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (shopping_list_id) REFERENCES ${TABLES.SHOPPING_LISTS}(id),
      FOREIGN KEY (ingredient_id) REFERENCES ${TABLES.INGREDIENTS}(id)
    )
  `,

  [TABLES.USER_PROGRESS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.USER_PROGRESS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      completed_at TIMESTAMP,
      rating INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id),
      FOREIGN KEY (recipe_id) REFERENCES ${TABLES.RECIPES}(id)
    )
  `,

  [TABLES.ACHIEVEMENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.ACHIEVEMENTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT,
      requirements TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  [TABLES.USER_ACHIEVEMENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.USER_ACHIEVEMENTS} (
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id),
      FOREIGN KEY (achievement_id) REFERENCES ${TABLES.ACHIEVEMENTS}(id)
    )
  `,

  [TABLES.USER_STREAKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.USER_STREAKS} (
      user_id INTEGER PRIMARY KEY,
      streak_days INTEGER DEFAULT 0,
      last_cooked_date TEXT,
      max_streak_days INTEGER DEFAULT 0,
      total_cooked_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id)
    )
  `,

  [TABLES.PANTRY_INVENTORY]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PANTRY_INVENTORY} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      expiration_date TEXT,
      last_checked_date TEXT,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id),
      FOREIGN KEY (ingredient_id) REFERENCES ${TABLES.INGREDIENTS}(id)
    )
  `,
};

export const INDEXES = {
  // Performance indexes
  [TABLES.RECIPES]: [
    `CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON ${TABLES.RECIPES}(cuisine)`,
    `CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON ${TABLES.RECIPES}(difficulty)`,
    `CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON ${TABLES.RECIPES}(is_favorite)`,
    `CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON ${TABLES.RECIPES}(created_at DESC)`,
  ],

  [TABLES.INGREDIENTS]: [
    `CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ${TABLES.INGREDIENTS}(recipe_id)`,
  ],

  [TABLES.INSTRUCTIONS]: [
    `CREATE INDEX IF NOT EXISTS idx_instructions_recipe_id ON ${TABLES.INSTRUCTIONS}(recipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_instructions_step_number ON ${TABLES.INSTRUCTIONS}(step_number)`,
  ],

  [TABLES.MEAL_PLAN]: [
    `CREATE INDEX IF NOT EXISTS idx_meal_plan_user_id ON ${TABLES.MEAL_PLAN}(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_meal_plan_day_of_week ON ${TABLES.MEAL_PLAN}(day_of_week)`,
    `CREATE INDEX IF NOT EXISTS idx_meal_plan_meal_type ON ${TABLES.MEAL_PLAN}(meal_type)`,
  ],

  [TABLES.SHOPPING_LISTS]: [
    `CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON ${TABLES.SHOPPING_LISTS}(user_id)`,
  ],

  [TABLES.SHOPPING_LIST_ITEMS]: [
    `CREATE INDEX IF NOT EXISTS idx_shopping_list_items_shopping_list_id ON ${TABLES.SHOPPING_LIST_ITEMS}(shopping_list_id)`,
  ],

  [TABLES.USER_PROGRESS]: [
    `CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON ${TABLES.USER_PROGRESS}(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_progress_recipe_id ON ${TABLES.USER_PROGRESS}(recipe_id)`,
  ],

  [TABLES.USER_ACHIEVEMENTS]: [
    `CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON ${TABLES.USER_ACHIEVEMENTS}(user_id)`,
  ],

  [TABLES.PANTRY_INVENTORY]: [
    `CREATE INDEX IF NOT EXISTS idx_pantry_inventory_user_id ON ${TABLES.PANTRY_INVENTORY}(user_id)`,
  ],

  [TABLES.TAGS]: [
    `CREATE INDEX IF NOT EXISTS idx_tags_name ON ${TABLES.TAGS}(name)`,
  ],

  [TABLES.RECIPE_TAGS]: [
    `CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON ${TABLES.RECIPE_TAGS}(recipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON ${TABLES.RECIPE_TAGS}(tag_id)`,
  ],
};
