import { schemaMigrations, createTable, addColumns } from "@nozbe/watermelondb/Schema/migrations";

/**
 * Consolidated migrations - all schema changes in a single migration.
 * Schema version 2. Existing users at v10: delete app to reset (DB will reset on version downgrade).
 */
export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        createTable({
          name: "consumption_log",
          columns: [
            { name: "stock_id", type: "string", isIndexed: true },
            { name: "quantity_consumed", type: "number" },
            { name: "recipe_id", type: "string", isOptional: true, isIndexed: true },
            { name: "consumed_date", type: "number", isIndexed: true },
            { name: "is_before_expiry", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        // Base tables (recipe cache, stock, ingredient reference)
        createTable({
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
            { name: "tags", type: "string", isOptional: true },
            { name: "synced_at", type: "number" },
            { name: "is_favorite", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
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
        createTable({
          name: "recipe_ingredient",
          columns: [
            { name: "recipe_id", type: "string", isIndexed: true },
            { name: "name", type: "string" },
            { name: "quantity", type: "number" },
            { name: "unit", type: "string" },
            { name: "notes", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "steps_to_store",
          columns: [
            { name: "title", type: "string" },
            { name: "description", type: "string" },
            { name: "sequence", type: "number" },
            { name: "stock_id", type: "string", isIndexed: true },
            { name: "synced_at", type: "number" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "stock",
          columns: [
            { name: "name", type: "string" },
            { name: "quantity", type: "number" },
            { name: "unit", type: "string" },
            { name: "expiry_date", type: "number", isOptional: true },
            { name: "storage_type", type: "string", isOptional: true },
            { name: "image_url", type: "string", isOptional: true },
            { name: "background_color", type: "string", isOptional: true },
            { name: "x", type: "number", isOptional: true },
            { name: "y", type: "number", isOptional: true },
            { name: "scale", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "ingredient_category",
          columns: [
            { name: "name", type: "string" },
            { name: "synced_at", type: "number" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "ingredient_synonym",
          columns: [
            { name: "stock_id", type: "string", isIndexed: true },
            { name: "synonym", type: "string", isIndexed: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "stock_category",
          columns: [
            { name: "stock_id", type: "string", isIndexed: true },
            { name: "category_id", type: "string", isIndexed: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Recipe type column
        addColumns({
          table: "recipe",
          columns: [{ name: "type", type: "string", isOptional: true }],
        }),
        // Recipe versioning
        createTable({
          name: "recipe_version",
          columns: [
            { name: "recipe_id", type: "string", isIndexed: true },
            { name: "version_number", type: "number" },
            { name: "title", type: "string" },
            { name: "description", type: "string" },
            { name: "prep_minutes", type: "number" },
            { name: "cook_minutes", type: "number" },
            { name: "difficulty_stars", type: "number" },
            { name: "servings", type: "number" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Cooking history & waste log
        createTable({
          name: "cooking_history",
          columns: [
            { name: "recipe_id", type: "string", isIndexed: true },
            { name: "cooked_at", type: "number" },
            { name: "rating", type: "number", isOptional: true },
            { name: "notes", type: "string", isOptional: true },
            { name: "servings_made", type: "number", isOptional: true },
            { name: "photo_url", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "waste_log",
          columns: [
            { name: "stock_id", type: "string", isIndexed: true },
            { name: "quantity_wasted", type: "number" },
            { name: "reason", type: "string", isOptional: true },
            { name: "waste_date", type: "number", isIndexed: true },
            { name: "estimated_cost", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Meal planning & grocery
        createTable({
          name: "meal_plan",
          columns: [
            { name: "recipe_id", type: "string", isIndexed: true },
            { name: "date", type: "number" },
            { name: "meal_slot", type: "string" },
            { name: "servings", type: "number" },
            { name: "template_id", type: "string", isOptional: true, isIndexed: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "meal_plan_template",
          columns: [
            { name: "name", type: "string" },
            { name: "description", type: "string", isOptional: true },
            { name: "meal_slots", type: "string" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "grocery_item_check",
          columns: [
            { name: "ingredient_name", type: "string", isIndexed: true },
            { name: "is_checked", type: "boolean" },
            { name: "is_deleted", type: "boolean", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Tailored recipe mapping
        createTable({
          name: "tailored_recipe_mapping",
          columns: [
            { name: "hash", type: "string", isIndexed: true },
            { name: "recipe_id", type: "string", isIndexed: true },
            { name: "expiry_datetime", type: "number", isIndexed: true },
            { name: "created_at", type: "number" },
          ],
        }),
        // Achievements
        createTable({
          name: "achievement",
          columns: [
            { name: "type", type: "string" },
            { name: "category", type: "string" },
            { name: "title", type: "string" },
            { name: "description", type: "string" },
            { name: "icon", type: "string" },
            { name: "requirement", type: "string" },
            { name: "reward", type: "string", isOptional: true },
            { name: "xp", type: "number", isOptional: true },
            { name: "sort_order", type: "number" },
            { name: "hidden", type: "boolean", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "user_achievement",
          columns: [
            { name: "achievement_id", type: "string", isIndexed: true },
            { name: "status", type: "string" },
            { name: "progress", type: "number" },
            { name: "unlocked_at", type: "number", isOptional: true },
            { name: "last_checked_at", type: "number" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Challenges
        createTable({
          name: "challenge",
          columns: [
            { name: "type", type: "string" },
            { name: "title", type: "string" },
            { name: "description", type: "string" },
            { name: "requirement", type: "string" },
            { name: "reward", type: "string" },
            { name: "start_date", type: "number" },
            { name: "end_date", type: "number" },
            { name: "xp", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "user_challenge",
          columns: [
            { name: "challenge_id", type: "string", isIndexed: true },
            { name: "status", type: "string" },
            { name: "progress", type: "number" },
            { name: "started_at", type: "number", isOptional: true },
            { name: "completed_at", type: "number", isOptional: true },
            { name: "claimed_at", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
  ],
});
