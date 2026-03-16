# Recipe-n Database Schema

## Overview

Mobile-first cooking app with offline-first architecture using SQLite (iOS) / Room (Android).

## Core Tables

### 1. users

Stores user accounts and preferences.

| Column               | Type      | Constraints               | Description                                                    |
| -------------------- | --------- | ------------------------- | -------------------------------------------------------------- |
| id                   | INTEGER   | PRIMARY KEY AUTOINCREMENT | User unique ID                                                 |
| email                | TEXT      | UNIQUE NOT NULL           | User email                                                     |
| username             | TEXT      | UNIQUE NOT NULL           | Username                                                       |
| password_hash        | TEXT      | NOT NULL                  | Encrypted password                                             |
| created_at           | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time                                          |
| dietary_restrictions | TEXT      |                           | JSON string of dietary restrictions (vegan, gluten-free, etc.) |
| preferences          | TEXT      |                           | JSON string of preferences                                     |
| is_offline_mode      | BOOLEAN   | DEFAULT TRUE              | Default offline mode preference                                |

### 2. recipes

Stores recipe data.

| Column             | Type      | Constraints                                     | Description                                      |
| ------------------ | --------- | ----------------------------------------------- | ------------------------------------------------ |
| id                 | INTEGER   | PRIMARY KEY AUTOINCREMENT                       | Recipe unique ID                                 |
| title              | TEXT      | NOT NULL                                        | Recipe title                                     |
| description        | TEXT      |                                                 | Recipe description                               |
| cuisine            | TEXT      |                                                 | Cuisine type (Italian, Japanese, etc.)           |
| difficulty         | TEXT      | CHECK(difficulty IN ('Easy', 'Medium', 'Hard')) | Cooking difficulty                               |
| prep_time_minutes  | INTEGER   | DEFAULT 0                                       | Prep time in minutes                             |
| cook_time_minutes  | INTEGER   | DEFAULT 0                                       | Cook time in minutes                             |
| total_time_minutes | INTEGER   |                                                 | Total time (prep + cook)                         |
| servings           | INTEGER   | DEFAULT 1                                       | Number of servings                               |
| is_favorite        | BOOLEAN   | DEFAULT FALSE                                   | Is user favorite?                                |
| calories           | INTEGER   |                                                 | Estimated calories per serving                   |
| source             | TEXT      |                                                 | Source of recipe (curated, user-generated, etc.) |
| created_at         | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP                       | Recipe creation time                             |
| updated_at         | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP                       | Recipe last update                               |

### 3. ingredients

Stores ingredients for recipes with substitutions.

| Column                 | Type    | Constraints                   | Description                             |
| ---------------------- | ------- | ----------------------------- | --------------------------------------- |
| id                     | INTEGER | PRIMARY KEY AUTOINCREMENT     | Ingredient unique ID                    |
| recipe_id              | INTEGER | FOREIGN KEY → recipes(id)     | Reference to recipe                     |
| name                   | TEXT    | NOT NULL                      | Ingredient name                         |
| amount                 | TEXT    | NOT NULL                      | Amount (e.g., "2 cups")                 |
| unit                   | TEXT    |                               | Unit (cups, tbsp, grams, etc.)          |
| notes                  | TEXT    |                               | Special notes (e.g., "fine", "chopped") |
| is_substitute          | BOOLEAN | DEFAULT FALSE                 | Is this a substitute?                   |
| original_ingredient_id | INTEGER | FOREIGN KEY → ingredients(id) | Original ingredient for substitutes     |
| substitution_score     | INTEGER |                               | Compatibility score 0-100               |

### 4. instructions

Stores step-by-step cooking instructions.

| Column                 | Type    | Constraints               | Description                 |
| ---------------------- | ------- | ------------------------- | --------------------------- |
| id                     | INTEGER | PRIMARY KEY AUTOINCREMENT | Instruction unique ID       |
| recipe_id              | INTEGER | FOREIGN KEY → recipes(id) | Reference to recipe         |
| step_number            | INTEGER | NOT NULL                  | Step number                 |
| instruction_text       | TEXT    | NOT NULL                  | Step description            |
| estimated_time_minutes | INTEGER |                           | Time estimate for this step |
| completion_status      | TEXT    | DEFAULT 'pending'         | Status (pending, completed) |

### 5. tags

Stores recipe tags/categories.

| Column   | Type    | Constraints               | Description                       |
| -------- | ------- | ------------------------- | --------------------------------- |
| id       | INTEGER | PRIMARY KEY AUTOINCREMENT | Tag unique ID                     |
| name     | TEXT    | UNIQUE NOT NULL           | Tag name                          |
| category | TEXT    |                           | Category (dietary, cuisine, etc.) |

### 6. recipe_tags

Many-to-many relationship between recipes and tags.

| Column                          | Type    | Constraints               | Description           |
| ------------------------------- | ------- | ------------------------- | --------------------- |
| recipe_id                       | INTEGER | FOREIGN KEY → recipes(id) | Recipe ID             |
| tag_id                          | INTEGER | FOREIGN KEY → tags(id)    | Tag ID                |
| PRIMARY KEY (recipe_id, tag_id) |         |                           | Composite primary key |

### 7. meal_plan

Stores weekly meal plans.

| Column      | Type      | Constraints                                                   | Description         |
| ----------- | --------- | ------------------------------------------------------------- | ------------------- |
| id          | INTEGER   | PRIMARY KEY AUTOINCREMENT                                     | Meal plan unique ID |
| user_id     | INTEGER   | FOREIGN KEY → users(id)                                       | User ID             |
| day_of_week | INTEGER   | CHECK(day_of_week >= 1 AND day_of_week <= 7)                  | Day of week         |
| meal_type   | TEXT      | CHECK(meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')) | Meal type           |
| recipe_id   | INTEGER   | FOREIGN KEY → recipes(id)                                     | Recipe ID           |
| servings    | INTEGER   | DEFAULT 1                                                     | Number of servings  |
| created_at  | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP                                     | Plan creation time  |

### 8. shopping_lists

Stores shopping lists.

| Column     | Type      | Constraints               | Description               |
| ---------- | --------- | ------------------------- | ------------------------- |
| id         | INTEGER   | PRIMARY KEY AUTOINCREMENT | Shopping list unique ID   |
| user_id    | INTEGER   | FOREIGN KEY → users(id)   | User ID                   |
| name       | TEXT      | DEFAULT 'Shopping List'   | List name                 |
| is_active  | BOOLEAN   | DEFAULT TRUE              | Is list currently in use? |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | List creation time        |

### 9. shopping_list_items

Stores items in shopping lists.

| Column           | Type    | Constraints                      | Description         |
| ---------------- | ------- | -------------------------------- | ------------------- |
| id               | INTEGER | PRIMARY KEY AUTOINCREMENT        | Item unique ID      |
| shopping_list_id | INTEGER | FOREIGN KEY → shopping_lists(id) | Shopping list ID    |
| ingredient_id    | INTEGER | FOREIGN KEY → ingredients(id)    | Ingredient ID       |
| amount           | TEXT    |                                  | Amount to buy       |
| unit             | TEXT    |                                  | Unit                |
| is_purchased     | BOOLEAN | DEFAULT FALSE                    | Has user purchased? |
| notes            | TEXT    |                                  | Notes               |

### 10. user_progress

Tracks cooking progress and achievements.

| Column       | Type      | Constraints               | Description               |
| ------------ | --------- | ------------------------- | ------------------------- |
| id           | INTEGER   | PRIMARY KEY AUTOINCREMENT | Progress unique ID        |
| user_id      | INTEGER   | FOREIGN KEY → users(id)   | User ID                   |
| recipe_id    | INTEGER   | FOREIGN KEY → recipes(id) | Recipe ID                 |
| completed_at | TIMESTAMP |                           | When recipe was completed |
| rating       | INTEGER   |                           | User rating 1-5           |
| notes        | TEXT      |                           | User notes/reviews        |
| created_at   | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Progress tracking time    |

### 11. achievements

Stores achievement definitions.

| Column       | Type      | Constraints               | Description                                     |
| ------------ | --------- | ------------------------- | ----------------------------------------------- |
| id           | INTEGER   | PRIMARY KEY AUTOINCREMENT | Achievement unique ID                           |
| code         | TEXT      | UNIQUE NOT NULL           | Achievement code (e.g., 'Sous_Chef')            |
| title        | TEXT      | NOT NULL                  | Achievement title                               |
| description  | TEXT      | NOT NULL                  | Achievement description                         |
| icon         | TEXT      |                           | Icon/image URL                                  |
| requirements | TEXT      | JSON                      | Requirements (recipes count, streak days, etc.) |
| created_at   | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time                                   |

### 12. user_achievements

Tracks earned achievements.

| Column                                | Type      | Constraints                    | Description           |
| ------------------------------------- | --------- | ------------------------------ | --------------------- |
| user_id                               | INTEGER   | FOREIGN KEY → users(id)        | User ID               |
| achievement_id                        | INTEGER   | FOREIGN KEY → achievements(id) | Achievement ID        |
| earned_at                             | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP      | When earned           |
| PRIMARY KEY (user_id, achievement_id) |           |                                | Composite primary key |

### 13. user_streaks

Tracks cooking streaks.

| Column             | Type    | Constraints | Description             |
| ------------------ | ------- | ----------- | ----------------------- |
| user_id            | INTEGER | PRIMARY KEY | User ID                 |
| streak_days        | INTEGER | DEFAULT 0   | Current streak in days  |
| last_cooked_date   | DATE    |             | Last cooking date       |
| max_streak_days    | INTEGER | DEFAULT 0   | Maximum streak achieved |
| total_cooked_count | INTEGER | DEFAULT 0   | Total recipes cooked    |

### 14. pantry_inventory

Stores user's pantry items.

| Column            | Type    | Constraints                   | Description       |
| ----------------- | ------- | ----------------------------- | ----------------- |
| id                | INTEGER | PRIMARY KEY AUTOINCREMENT     | Item unique ID    |
| user_id           | INTEGER | FOREIGN KEY → users(id)       | User ID           |
| ingredient_id     | INTEGER | FOREIGN KEY → ingredients(id) | Ingredient ID     |
| quantity          | REAL    | NOT NULL                      | Current quantity  |
| unit              | TEXT    |                               | Unit              |
| expiration_date   | DATE    |                               | Expiration date   |
| last_checked_date | DATE    |                               | Last time checked |

## Indexes

```sql
-- Performance optimizations
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX idx_instructions_recipe_id ON instructions(recipe_id);
CREATE INDEX idx_instructions_step_number ON instructions(step_number);
CREATE INDEX idx_meal_plan_user_id ON meal_plan(user_id);
CREATE INDEX idx_meal_plan_day_of_week ON meal_plan(day_of_week);
CREATE INDEX idx_meal_plan_meal_type ON meal_plan(meal_type);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_list_items_shopping_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_recipe_id ON user_progress(recipe_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_pantry_inventory_user_id ON pantry_inventory(user_id);
```

## Relationships Summary

```
User (1) ──> (N) Recipe
Recipe (1) ──> (N) Ingredient
Recipe (1) ──> (N) Instruction
Recipe (1) ──> (N) Tag (via recipe_tags)
Recipe (1) ──> (N) Meal Plan (via meal_plan)
Recipe (1) ──> (N) Progress (via user_progress)
Recipe (1) ──> (N) Shopping List (via shopping_list_items)

User (1) ──> (N) Shopping List
Shopping List (1) ──> (N) Shopping List Item

User (1) ──> (N) Meal Plan
Meal Plan (1) ──> (N) Recipe

User (1) ──> (N) Progress
User (1) ──> (N) Achievement (via user_achievements)
User (1) ──> (N) Streak (via user_streaks)
User (1) ──> (N) Pantry Item (via pantry_inventory)
```

## Migration Strategy

### Version 1.0 - Initial Schema

```sql
CREATE TABLE users (...);
CREATE TABLE recipes (...);
CREATE TABLE ingredients (...);
CREATE TABLE instructions (...);
CREATE TABLE tags (...);
CREATE TABLE recipe_tags (...);
-- ... and so on
```

### Version 1.1 - Add User Progress

```sql
ALTER TABLE recipes ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
-- Create progress tracking tables
```

### Version 1.2 - Add Meal Planning

```sql
CREATE TABLE meal_plan (...);
CREATE TABLE shopping_lists (...);
-- ...
```

## Offline-First Considerations

### Local Database (SQLite/Room)

- All core data stored locally
- Auto-sync when connection restored
- Background sync on Wi-Fi + charging
- Conflict resolution strategy

### Sync Protocol

1. Client sends incremental changes
2. Server applies changes
3. Server returns server-synced state
4. Client merges and resolves conflicts

### Conflict Resolution

- Last write wins (with timestamps)
- Manual conflict resolution for user review
- Detailed conflict logging

---

**Database Schema Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Implementation
