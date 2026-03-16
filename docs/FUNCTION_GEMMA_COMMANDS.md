# Function Gemma Commands Reference

Complete reference for all AI assistant commands available in DoneDish via Function Gemma.

> These commands are invoked automatically by the on-device Function Gemma model when users type natural language queries into the AI search bar or chat screen. You do not call them manually — the model selects the right command based on the user's input.

---

## Table of Contents

- [Inventory Management](#inventory-management)
  - [add_item](#add_item)
  - [remove_item](#remove_item)
  - [get_inventory](#get_inventory)
- [Expiration Tracking](#expiration-tracking)
  - [get_expiring_items](#get_expiring_items)
  - [set_expiry_alert](#set_expiry_alert)
- [Grocery List](#grocery-list)
  - [add_to_grocery_list](#add_to_grocery_list)
  - [get_grocery_list](#get_grocery_list)
- [Recipe & Meal Planning](#recipe--meal-planning)
  - [find_recipes](#find_recipes)
  - [suggest_meals](#suggest_meals)
- [Product Identification](#product-identification)
  - [scan_barcode](#scan_barcode)
- [How It Works](#how-it-works)
- [Known Limitations](#known-limitations)

---

## Inventory Management

### `add_item`

Add a food item to the pantry inventory. This is the **default command** when the user says "add", "put", "store", or "I have" followed by a food name.

| Parameter     | Type     | Required | Default    | Description                                                        |
| ------------- | -------- | -------- | ---------- | ------------------------------------------------------------------ |
| `name`        | `string` | Yes      | —          | Name of the food item (e.g. "milk", "cheese", "apples")            |
| `quantity`    | `number` | No       | `1`        | Quantity of the item                                               |
| `unit`        | `string` | No       | `"piece"`  | Unit of measurement (e.g. "liters", "kg", "pieces", "cartons")     |
| `location`    | `string` | No       | `"fridge"` | Storage location. One of: `fridge`, `freezer`, `cabinet`, `pantry` |
| `expiry_date` | `string` | No       | —          | Expiry date in `YYYY-MM-DD` format                                 |

**Example natural language triggers:**

- "Add 2 cartons of milk to my fridge"
- "I have 3 apples"
- "Put chicken in the freezer"
- "Store rice in the pantry, expires 2026-06-01"

**Example tool call:**

```
add_item(name="milk", quantity=2, unit="cartons", location="fridge")
```

**Example response:**

```json
{
  "success": true,
  "ingredient": { "id": "abc123", "name": "milk" },
  "message": "Added 2 cartons of milk to fridge"
}
```

**Side effects:** Invalidates the pantry React Query cache so the UI refreshes immediately.

---

### `remove_item`

Remove or consume a food item from inventory. Can do partial removal (reduce quantity) or full removal (delete the item).

| Parameter  | Type     | Required | Default | Description                                                                   |
| ---------- | -------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `item_id`  | `string` | Yes      | —       | ID of the item to remove (WatermelonDB record ID)                             |
| `quantity` | `number` | No       | all     | Quantity to remove. If omitted or >= current stock, deletes the item entirely |

**Example natural language triggers:**

- "Remove the milk"
- "I used 2 eggs"
- "Delete the expired yogurt"

**Example tool call:**

```
remove_item(item_id="abc123", quantity=2)
```

**Example response (partial removal):**

```json
{
  "success": true,
  "message": "Removed 2 pieces of eggs"
}
```

**Example response (full removal):**

```json
{
  "success": true,
  "message": "Removed all milk from inventory"
}
```

**Side effects:** Invalidates the pantry React Query cache.

---

### `get_inventory`

Retrieve a list of all items currently in the pantry, optionally filtered by storage location.

| Parameter  | Type     | Required | Default | Description                                                                 |
| ---------- | -------- | -------- | ------- | --------------------------------------------------------------------------- |
| `location` | `string` | No       | `"all"` | Filter by location. One of: `fridge`, `freezer`, `cabinet`, `pantry`, `all` |
| `category` | `string` | No       | —       | Filter by category (e.g. "dairy", "vegetables", "meat")                     |

**Example natural language triggers:**

- "What's in my fridge?"
- "Show me my pantry"
- "List all my ingredients"
- "What do I have in the freezer?"

**Example tool call:**

```
get_inventory(location="fridge")
```

**Example response:**

```json
{
  "success": true,
  "count": 3,
  "items": [
    {
      "id": "abc123",
      "name": "milk",
      "quantity": 2,
      "unit": "cartons",
      "storage_type": "fridge",
      "expiry_date": "2026-02-20T00:00:00.000Z"
    },
    {
      "id": "def456",
      "name": "eggs",
      "quantity": 12,
      "unit": "piece",
      "storage_type": "fridge",
      "expiry_date": null
    }
  ]
}
```

> **Note:** The `category` filter is defined in the tool schema but not yet implemented in the executor. Currently only `location` filtering is active.

---

## Expiration Tracking

### `get_expiring_items`

Get items that will expire within a given number of days. Results are sorted by expiry date (soonest first).

| Parameter    | Type     | Required | Default | Description                              |
| ------------ | -------- | -------- | ------- | ---------------------------------------- |
| `days_ahead` | `number` | No       | `3`     | Number of days ahead to check for expiry |

**Example natural language triggers:**

- "What's expiring soon?"
- "Any food going bad this week?"
- "Check expiry dates"
- "What should I use up first?"

**Example tool call:**

```
get_expiring_items(days_ahead=7)
```

**Example response:**

```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "id": "abc123",
      "name": "yogurt",
      "quantity": 1,
      "unit": "piece",
      "expiry_date": "2026-02-18T00:00:00.000Z",
      "days_until_expiry": 1
    },
    {
      "id": "def456",
      "name": "chicken",
      "quantity": 1,
      "unit": "kg",
      "expiry_date": "2026-02-20T00:00:00.000Z",
      "days_until_expiry": 3
    }
  ]
}
```

---

### `set_expiry_alert`

Set a reminder/alert for an expiring item.

| Parameter    | Type     | Required | Default | Description                                          |
| ------------ | -------- | -------- | ------- | ---------------------------------------------------- |
| `item_id`    | `string` | Yes      | —       | ID of the item to set the alert for                  |
| `alert_time` | `string` | Yes      | —       | When to send the alert, in `YYYY-MM-DD HH:MM` format |

**Example natural language triggers:**

- "Remind me about the chicken expiring tomorrow"
- "Set an alert for the milk on Friday"

**Example tool call:**

```
set_expiry_alert(item_id="abc123", alert_time="2026-02-18 09:00")
```

> **Note:** This is currently a **stub implementation**. It adds a reminder entry to the grocery list as a workaround. Real push notifications via `expo-notifications` are planned but not yet integrated.

---

## Grocery List

### `add_to_grocery_list`

Add an item to the shopping/grocery list. Only triggered when the user **explicitly** mentions "grocery list", "shopping list", or "need to buy".

| Parameter  | Type     | Required | Default    | Description                                     |
| ---------- | -------- | -------- | ---------- | ----------------------------------------------- |
| `name`     | `string` | Yes      | —          | Name of the item to buy                         |
| `quantity` | `number` | No       | `1`        | Quantity to buy                                 |
| `priority` | `string` | No       | `"medium"` | Priority level. One of: `low`, `medium`, `high` |

**Example natural language triggers:**

- "Add milk to my grocery list"
- "I need to buy eggs"
- "Put bread on the shopping list"

**Example tool call:**

```
add_to_grocery_list(name="milk", quantity=2, priority="high")
```

**Example response:**

```json
{
  "success": true,
  "ingredient": { "id": "abc123", "name": "milk" },
  "message": "Added 2 milk to your pantry. (The grocery list is built from meal plan recipes.)"
}
```

> **Note:** The current architecture builds the grocery list from planned meal-plan recipes. Standalone grocery items aren't fully supported yet, so this command **redirects to `add_item`** and adds the item to the pantry instead.

---

### `get_grocery_list`

Retrieve the current grocery/shopping list.

| Parameter | Type     | Required | Default | Description                                                |
| --------- | -------- | -------- | ------- | ---------------------------------------------------------- |
| `filter`  | `string` | No       | `"all"` | Filter by priority. One of: `all`, `high`, `medium`, `low` |

**Example natural language triggers:**

- "Show my grocery list"
- "What do I need to buy?"
- "What's on my shopping list?"

**Example tool call:**

```
get_grocery_list(filter="high")
```

**Example response:**

```json
{
  "success": true,
  "count": 2,
  "items": [
    { "id": "ghi789", "name": "milk", "checked": false },
    { "id": "jkl012", "name": "bread", "checked": true }
  ]
}
```

> **Note:** The `filter` parameter is defined in the tool schema but the executor currently returns all non-deleted items regardless of filter.

---

## Recipe & Meal Planning

### `find_recipes`

Search for recipes, optionally filtered by ingredients you want to use.

| Parameter     | Type       | Required | Default | Description                                                          |
| ------------- | ---------- | -------- | ------- | -------------------------------------------------------------------- |
| `ingredients` | `string[]` | No       | —       | List of ingredient names to search for in recipe titles/descriptions |
| `meal_type`   | `string`   | No       | —       | Type of meal. One of: `breakfast`, `lunch`, `dinner`, `snack`        |

**Example natural language triggers:**

- "What can I make with chicken and rice?"
- "Find me a breakfast recipe"
- "Recipes with eggs and cheese"
- "What can I cook tonight?"

**Example tool call:**

```
find_recipes(ingredients=["chicken", "rice"], meal_type="dinner")
```

**Example response:**

```json
{
  "success": true,
  "count": 3,
  "recipes": [
    {
      "id": "rec_001",
      "title": "Chicken Fried Rice",
      "description": "Classic chicken fried rice with vegetables",
      "prep_minutes": 15,
      "cook_minutes": 20
    },
    {
      "id": "rec_002",
      "title": "Chicken Rice Bowl",
      "description": "Japanese-style chicken rice bowl",
      "prep_minutes": 10,
      "cook_minutes": 25
    }
  ]
}
```

**How matching works:** Recipes are fetched from Supabase, then filtered client-side by checking if any of the provided ingredient names appear in the recipe `title` or `description` (case-insensitive). Results are capped at 10.

> **Note:** The `meal_type` parameter is defined in the tool schema but not yet used for filtering in the executor.

---

### `suggest_meals`

Suggest meals based on what's currently in your pantry inventory. This command automatically reads your inventory first, then searches for matching recipes.

| Parameter   | Type     | Required | Default | Description                                          |
| ----------- | -------- | -------- | ------- | ---------------------------------------------------- |
| `meal_type` | `string` | No       | —       | Type of meal. One of: `breakfast`, `lunch`, `dinner` |
| `days`      | `number` | No       | `1`     | Number of days to plan meals for                     |

**Example natural language triggers:**

- "What should I cook tonight?"
- "Suggest meals for this week"
- "What can I make with what I have?"
- "Meal suggestions"

**Example tool call:**

```
suggest_meals(meal_type="dinner", days=3)
```

**Example response:**

```json
{
  "success": true,
  "based_on_inventory": ["chicken", "rice", "eggs", "milk"],
  "suggestions": [
    {
      "id": "rec_001",
      "title": "Chicken Fried Rice",
      "description": "Classic chicken fried rice",
      "prep_minutes": 15,
      "cook_minutes": 20
    }
  ]
}
```

**How it works internally:**

1. Calls `get_inventory()` to get all current pantry items
2. Extracts ingredient names from the inventory
3. Calls `find_recipes()` with those ingredient names
4. Returns matching recipes as suggestions

> **Note:** The `meal_type` and `days` parameters are defined in the schema but not yet used in the executor logic.

---

## Product Identification

### `scan_barcode`

Look up a product by its barcode/UPC code using the Supabase base ingredient database.

| Parameter | Type     | Required | Default | Description                |
| --------- | -------- | -------- | ------- | -------------------------- |
| `barcode` | `string` | Yes      | —       | Barcode or UPC code string |

**Example natural language triggers:**

- "Scan this barcode: 012345678901"
- "Look up barcode 5901234123457"

**Example tool call:**

```
scan_barcode(barcode="012345678901")
```

**Example response (found):**

```json
{
  "success": true,
  "product": {
    "id": "base_001",
    "name": "Organic Whole Milk",
    "category": "dairy"
  }
}
```

**Example response (not found):**

```json
{
  "success": false,
  "error": "No product found for barcode: 012345678901"
}
```

> **Note:** The current implementation uses `getBaseIngredientByName()` with the barcode string, which looks up by name rather than a dedicated barcode field. This may need adjustment for true barcode scanning.

---

## How It Works

1. **User types** a natural language query into the AI search bar or chat screen.
2. **Function Gemma** (270M parameter model, running on-device via `llama.rn`) analyzes the query and decides which command to call.
3. The model outputs a structured tool call in the format:
   ```
   <start_function_call>call:func_name{key:<escape>value<escape>}<end_function_call>
   ```
4. **FunctionGemmaService** parses the output (with fallback to `llama.rn`'s native parser) and routes the call to the corresponding method on `DoneDishToolExecutor`.
5. **DoneDishToolExecutor** executes the command against WatermelonDB (local) or Supabase (cloud) and returns the result.
6. A **second model completion** generates a natural language response from the tool result (with a formatted fallback if the second completion fails).
7. The response is displayed to the user in the UI.

---

## Known Limitations

| Area                  | Limitation                                                                            | Status                       |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| `add_to_grocery_list` | Redirects to `add_item` (pantry) since standalone grocery items aren't supported      | Workaround active            |
| `set_expiry_alert`    | Stub — no real push notifications yet                                                 | Planned (expo-notifications) |
| `category` filter     | Defined in `get_inventory` schema but not implemented in executor                     | Planned                      |
| `meal_type` filter    | Defined in `find_recipes` / `suggest_meals` schema but not used                       | Planned                      |
| `priority` filter     | Defined in `get_grocery_list` schema but not used in executor                         | Planned                      |
| `scan_barcode`        | Uses name lookup instead of a dedicated barcode field                                 | Needs adjustment             |
| Multi-tool calls      | Model only executes the **first** valid tool call to prevent hallucinations           | By design                    |
| Recipe matching       | Matches ingredient names against recipe title/description only (not ingredient lists) | Planned improvement          |
