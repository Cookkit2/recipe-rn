import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 1,
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
  ],
});
