import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 1,
  tables: [
    // Recipe table
    tableSchema({
      name: "recipes",
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
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Recipe Steps table
    tableSchema({
      name: "recipe_steps",
      columns: [
        { name: "step", type: "number" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Base Ingredient table
    tableSchema({
      name: "base_ingredients",
      columns: [
        { name: "name", type: "string" },
        { name: "synonyms", type: "string", isOptional: true }, // JSON string array
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Ingredient Category table
    tableSchema({
      name: "ingredient_categories",
      columns: [
        { name: "name", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Recipe Ingredient pivot table
    tableSchema({
      name: "recipe_ingredients",
      columns: [
        { name: "recipe_id", type: "string", isIndexed: true },
        { name: "base_ingredient_id", type: "string", isIndexed: true },
        { name: "name", type: "string" }, // Display name for this recipe
        { name: "quantity", type: "string" },
        { name: "notes", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Ingredient Category pivot table
    tableSchema({
      name: "ingredient_category_assignments",
      columns: [
        { name: "ingredient_id", type: "string", isIndexed: true },
        { name: "category_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Stock table (Previously PantryItem)
    tableSchema({
      name: "stock",
      columns: [
        { name: "base_ingredient_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "quantity", type: "number" },
        { name: "unit", type: "string" },
        { name: "expiry_date", type: "number", isOptional: true }, // timestamp
        { name: "type", type: "string", isOptional: true },
        { name: "image_url", type: "string", isOptional: true },
        { name: "background_color", type: "string", isOptional: true },
        { name: "x", type: "number", isOptional: true },
        { name: "y", type: "number", isOptional: true },
        { name: "scale", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Steps to Store table
    tableSchema({
      name: "steps_to_store",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "sequence", type: "number" },
        { name: "ingredient_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Users table
    tableSchema({
      name: "users",
      columns: [
        { name: "username", type: "string" },
        { name: "role", type: "string" },
        { name: "preferences", type: "string", isOptional: true }, // JSON string
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
