import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ===============================================
    // Pantry Items Table
    // ===============================================
    tableSchema({
      name: 'pantry_items',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'expiry_date', type: 'number', isOptional: true }, // timestamp
        { name: 'category', type: 'string' },
        { name: 'type', type: 'string' }, // fridge, cabinet, freezer
        { name: 'image_url', type: 'string' },
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'scale', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true }, // pending, synced, conflict
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Steps to Store Table (related to pantry items)
    // ===============================================
    tableSchema({
      name: 'steps_to_store',
      columns: [
        { name: 'pantry_item_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'sequence', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Recipes Table
    // ===============================================
    tableSchema({
      name: 'recipes',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: 'prep_minutes', type: 'number', isOptional: true },
        { name: 'cook_minutes', type: 'number', isOptional: true },
        { name: 'difficulty_stars', type: 'number', isOptional: true },
        { name: 'servings', type: 'number', isOptional: true },
        { name: 'source_url', type: 'string', isOptional: true },
        { name: 'calories', type: 'number', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array as string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Recipe Ingredients Table
    // ===============================================
    tableSchema({
      name: 'recipe_ingredients',
      columns: [
        { name: 'recipe_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'related_ingredient_id', type: 'string', isOptional: true },
        { name: 'quantity', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'order_index', type: 'number' }, // for maintaining order
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Recipe Steps Table
    // ===============================================
    tableSchema({
      name: 'recipe_steps',
      columns: [
        { name: 'recipe_id', type: 'string', isIndexed: true },
        { name: 'step', type: 'number' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'related_ingredient_ids', type: 'string', isOptional: true }, // JSON array as string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Recipe Rack Items Table (saved/favorited recipes)
    // ===============================================
    tableSchema({
      name: 'recipe_rack_items',
      columns: [
        { name: 'recipe_id', type: 'string', isIndexed: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'rating', type: 'number', isOptional: true },
        { name: 'times_cooked', type: 'number' },
        { name: 'last_cooked_at', type: 'number', isOptional: true },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array as string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // User Preferences Table
    // ===============================================
    tableSchema({
      name: 'user_preferences',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' }, // JSON string for complex values
        { name: 'type', type: 'string' }, // string, number, boolean, object
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ===============================================
    // Sync Metadata Table (for tracking sync operations)
    // ===============================================
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'table_name', type: 'string', isIndexed: true },
        { name: 'last_pull_at', type: 'number', isOptional: true },
        { name: 'last_push_at', type: 'number', isOptional: true },
        { name: 'pending_changes', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
