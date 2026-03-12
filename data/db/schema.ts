import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 2,
  tables: [
    // ========================================
    // RECIPE CACHE (3 tables)
    // Synced from cloud for offline access
    // ========================================

    // Recipe table
    tableSchema({
      name: "recipe",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "image_url", type: "string", isOptional: true },
        { name: "prep_minutes", type: "number" },
        { name: "cook_minutes", type: "number" },
        { name: "difficulty_stars", type: "number" },
        { name: "servings", type: "number" },
        { name: "source_url", type: "string", isOptional: true },
        { name: "calories", type: "number", isOptional: true },
        { name: "tags", type: "string", isOptional: true }, // JSON string array
        { name: "synced_at", type: "number" }, // NEW: Track last sync time (daily refresh)
        { name: "is_favorite", type: "boolean" }, // NEW: User can favorite recipes
        { name: "type", type: "string", isOptional: true }, // RecipeType enum: standard | tailored | converted
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Recipe Steps table
    tableSchema({
      name: "recipe_step",
      columns: [
        { name: "step", type: "number" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Recipe Ingredient pivot table
    tableSchema({
      name: "recipe_ingredient",
      columns: [
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "name", type: "string" }, // Display name for this recipe
        { name: "quantity", type: "number" },
        { name: "unit", type: "string" },
        { name: "notes", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // RECIPE VERSIONING (1 table)
    // Stores snapshot history for recipe editing and reverting
    // ========================================

    // Recipe Version table - Stores historical versions of recipes
    tableSchema({
      name: "recipe_version",
      columns: [
        { name: "recipe_id", type: "string", isIndexed: true }, // References original recipe
        { name: "version_number", type: "number" }, // Sequential version number
        { name: "title", type: "string" }, // Recipe title at this version
        { name: "description", type: "string" }, // Recipe description at this version
        { name: "prep_minutes", type: "number" }, // Prep time at this version
        { name: "cook_minutes", type: "number" }, // Cook time at this version
        { name: "difficulty_stars", type: "number" }, // Difficulty at this version
        { name: "servings", type: "number" }, // Servings at this version
        { name: "created_at", type: "number" }, // When this version was created
        { name: "updated_at", type: "number" }, // When this version was last updated
      ],
    }),

    // ========================================
    // INGREDIENT STORAGE INSTRUCTIONS (1 table)
    // Synced from cloud for offline access
    // ========================================

    // Steps to Store table
    tableSchema({
      name: "steps_to_store",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "sequence", type: "number" },
        { name: "stock_id", type: "string", isIndexed: true }, // References current stock id
        { name: "synced_at", type: "number" }, // NEW: Track sync time
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // USER DATA (2 tables)
    // User-owned local data
    // ========================================

    // Stock table (User's pantry items)
    tableSchema({
      name: "stock",
      columns: [
        { name: "name", type: "string" },
        { name: "quantity", type: "number" },
        { name: "unit", type: "string" },
        { name: "expiry_date", type: "number", isOptional: true }, // timestamp
        { name: "storage_type", type: "string", isOptional: true }, // "fridge" | "cabinet" | "freezer"
        { name: "image_url", type: "string", isOptional: true },
        { name: "background_color", type: "string", isOptional: true },
        { name: "x", type: "number", isOptional: true },
        { name: "y", type: "number", isOptional: true },
        { name: "scale", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // INGREDIENT REFERENCE DATA (4 tables)
    // Synced from cloud for offline matching
    // ========================================

    // Ingredient Category table
    tableSchema({
      name: "ingredient_category",
      columns: [
        { name: "name", type: "string" },
        { name: "synced_at", type: "number" }, // Track sync time
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Ingredient Synonym table
    tableSchema({
      name: "ingredient_synonym",
      columns: [
        { name: "stock_id", type: "string", isIndexed: true }, // Link to stock item
        { name: "synonym", type: "string", isIndexed: true }, // Alternative name for matching
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Stock Category Pivot table
    tableSchema({
      name: "stock_category",
      columns: [
        { name: "stock_id", type: "string", isIndexed: true },
        { name: "category_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Cooking History table (NEW - Track user's cooking activity)
    tableSchema({
      name: "cooking_history",
      columns: [
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "cooked_at", type: "number" }, // Timestamp when cooked
        { name: "rating", type: "number", isOptional: true }, // 1-5 stars
        { name: "notes", type: "string", isOptional: true }, // User's cooking notes/modifications
        { name: "servings_made", type: "number", isOptional: true }, // Actual servings prepared
        { name: "photo_url", type: "string", isOptional: true }, // Local file path to photo
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Waste Log table (NEW - Track discarded ingredients for analytics)
    tableSchema({
      name: "waste_log",
      columns: [
        { name: "stock_id", type: "string", isIndexed: true }, // Reference to wasted stock item
        { name: "quantity_wasted", type: "number" }, // Amount that was wasted
        { name: "reason", type: "string", isOptional: true }, // Reason: expired, spoiled, excess, accidental
        { name: "waste_date", type: "number", isIndexed: true }, // Timestamp when wasted
        { name: "estimated_cost", type: "number", isOptional: true }, // Money lost (in cents)
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // MEAL PLANNING & GROCERY LIST (3 tables)
    // User-owned local data for meal planning
    // ========================================

    // Meal Plan table - Stores recipes user wants to cook
    tableSchema({
      name: "meal_plan",
      columns: [
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "date", type: "number" }, // Date of the meal (timestamp)
        { name: "meal_slot", type: "string" }, // Meal slot: "breakfast" | "lunch" | "dinner" | "snack"
        { name: "servings", type: "number" }, // User-selected servings
        { name: "template_id", type: "string", isOptional: true, isIndexed: true }, // References meal plan template
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Meal Plan Template table - Reusable meal planning templates
    tableSchema({
      name: "meal_plan_template",
      columns: [
        { name: "name", type: "string" }, // Template name
        { name: "description", type: "string", isOptional: true }, // Template description
        { name: "meal_slots", type: "string" }, // JSON string of meal slot definitions
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Grocery Item Check table - Persists checked-off items during shopping
    tableSchema({
      name: "grocery_item_check",
      columns: [
        { name: "ingredient_name", type: "string", isIndexed: true }, // Normalized ingredient name
        { name: "is_checked", type: "boolean" },
        { name: "is_deleted", type: "boolean", isOptional: true }, // NEW: User can remove items from list
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // TAILORED RECIPE MAPPING (1 table)
    // Maps pantry hash to tailored recipes for caching
    // ========================================

    tableSchema({
      name: "tailored_recipe_mapping",
      columns: [
        { name: "hash", type: "string", isIndexed: true }, // Pantry state hash
        { name: "recipe_id", type: "string", isIndexed: true }, // References tailored recipe
        { name: "expiry_datetime", type: "number", isIndexed: true }, // Cache expiration timestamp
        { name: "created_at", type: "number" },
      ],
    }),

    // ========================================
    // GAMIFICATION - ACHIEVEMENTS (2 tables)
    // Track user achievements and unlock progress
    // ========================================

    // Achievement table - Definitions for all achievements
    tableSchema({
      name: "achievement",
      columns: [
        { name: "type", type: "string" }, // milestone | streak | cumulative | special
        { name: "category", type: "string" }, // streak | recipes | ingredients | waste | social
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "icon", type: "string" }, // Emoji or icon name
        { name: "requirement", type: "string" }, // JSON stringified AchievementRequirement
        { name: "reward", type: "string", isOptional: true }, // JSON stringified AchievementReward
        { name: "xp", type: "number", isOptional: true }, // XP reward for unlocking
        { name: "sort_order", type: "number" }, // Display order
        { name: "hidden", type: "boolean", isOptional: true }, // Hidden until unlocked
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // User Achievement table - User's progress toward achievements
    tableSchema({
      name: "user_achievement",
      columns: [
        { name: "achievement_id", type: "string", isIndexed: true }, // References achievement
        { name: "status", type: "string" }, // locked | unlocked | in_progress
        { name: "progress", type: "number" }, // Current progress toward requirement
        { name: "unlocked_at", type: "number", isOptional: true }, // Timestamp when unlocked
        { name: "last_checked_at", type: "number" }, // Timestamp of last progress check
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ========================================
    // GAMIFICATION - CHALLENGES (2 tables)
    // Daily and weekly challenges for engagement
    // ========================================

    // Challenge table - Definitions for daily/weekly challenges
    tableSchema({
      name: "challenge",
      columns: [
        { name: "type", type: "string" }, // daily | weekly
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "requirement", type: "string" }, // JSON stringified ChallengeRequirement
        { name: "reward", type: "string" }, // JSON stringified ChallengeReward
        { name: "start_date", type: "number" }, // Timestamp when challenge becomes available
        { name: "end_date", type: "number" }, // Timestamp when challenge expires
        { name: "xp", type: "number", isOptional: true }, // XP reward for completion
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // User Challenge table - User's progress toward challenges
    tableSchema({
      name: "user_challenge",
      columns: [
        { name: "challenge_id", type: "string", isIndexed: true }, // References challenge
        { name: "status", type: "string" }, // available | active | completed | expired
        { name: "progress", type: "number" }, // Current progress toward requirement target
        { name: "started_at", type: "number", isOptional: true }, // Timestamp when user started
        { name: "completed_at", type: "number", isOptional: true }, // Timestamp when completed
        { name: "claimed_at", type: "number", isOptional: true }, // Timestamp when rewards claimed
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
