# API Reference

This document describes the API endpoints and data structures used in the recipe-rn application.

## Table of Contents

- [Recipe API](#recipe-api)
- [Pantry API](#pantry-api)
- [Base Ingredient API](#base-ingredient-api)
- [Meal Plan API](#meal-plan-api)
- [Authentication API](#authentication-api)

---

## Recipe API

### Fetch All Recipes

**Endpoint**: `recipeApi.fetchAllRecipes()`

**Description**: Fetches all recipes from the local database with full details.

**Returns**: `Promise<Recipe[]>`

**Example**:
```typescript
const recipes = await recipeApi.fetchAllRecipes();
```

**Deprecated**: Use `fetchRecipesPaginated` for better performance with large datasets.

---

### Fetch Recipes Paginated

**Endpoint**: `recipeApi.fetchRecipesPaginated(page, pageSize)`

**Description**: Fetches recipes with pagination for better performance.

**Parameters**:
- `page` (number, optional): Page number (0-indexed). Default: 0
- `pageSize` (number, optional): Number of recipes per page. Default: 20

**Returns**: 
```typescript
Promise<{
  recipes: Recipe[];
  hasMore: boolean;
  nextPage: number | null;
  totalCount: number;
}>
```

**Example**:
```typescript
const firstPage = await recipeApi.fetchRecipesPaginated(0, 20);
if (firstPage.hasMore) {
  const secondPage = await recipeApi.fetchRecipesPaginated(1, 20);
}
```

---

### Get Recipe by ID

**Endpoint**: `recipeApi.getRecipeById(id)`

**Description**: Fetches a single recipe by its ID.

**Parameters**:
- `id` (string): Recipe ID

**Returns**: `Promise<Recipe | null>`

**Example**:
```typescript
const recipe = await recipeApi.getRecipeById("recipe-123");
if (!recipe) {
  console.log("Recipe not found");
}
```

---

### Add Recipe

**Endpoint**: `recipeApi.addRecipe(recipe)`

**Description**: Creates a new recipe in the database.

**Parameters**:
- `recipe` (Omit<Recipe, "id">): Recipe data without ID

**Returns**: `Promise<Recipe>`

**Example**:
```typescript
const newRecipe = await recipeApi.addRecipe({
  title: "Spaghetti Carbonara",
  description: "Classic Italian pasta dish",
  imageUrl: "https://example.com/image.jpg",
  prepMinutes: 15,
  cookMinutes: 25,
  difficultyStars: 3,
  servings: 4,
  instructions: [
    { step: 1, title: "Boil pasta", description: "Cook pasta al dente" },
    { step: 2, title: "Make sauce", description: "Combine ingredients" },
  ],
  ingredients: [
    { name: "Spaghetti", quantity: 400, unit: "g" },
    { name: "Eggs", quantity: 4, unit: "pieces" },
  ],
});
```

---

### Update Recipe

**Endpoint**: `recipeApi.updateRecipe(id, updates)`

**Description**: Updates an existing recipe.

**Parameters**:
- `id` (string): Recipe ID
- `updates` (Partial<Recipe>): Fields to update

**Returns**: `Promise<Recipe>`

**Example**:
```typescript
const updatedRecipe = await recipeApi.updateRecipe("recipe-123", {
  title: "Spaghetti Carbonara (Updated)",
  prepMinutes: 20,
});
```

---

### Delete Recipe

**Endpoint**: `recipeApi.deleteRecipe(id)`

**Description**: Deletes a recipe from the database.

**Parameters**:
- `id` (string): Recipe ID

**Returns**: `Promise<void>`

---

## Pantry API

### Fetch All Pantry Items

**Endpoint**: `pantryApi.fetchAllPantryItems()`

**Description**: Fetches all pantry items from local storage.

**Returns**: `Promise<PantryItem[]>`

**Example**:
```typescript
const pantryItems = await pantryApi.fetchAllPantryItems();
```

---

### Add Pantry Items

**Endpoint**: `pantryApi.addPantryItems(items)`

**Description**: Adds new pantry items to storage.

**Parameters**:
- `items` (Omit<PantryItem, "id" | "created_at" | "updated_at">[]): Array of pantry items

**Returns**: `Promise<PantryItem[]>`

**Example**:
```typescript
const newItems = await pantryApi.addPantryItems([
  {
    name: "Tomatoes",
    quantity: 5,
    unit: "pieces",
    expiry_date: "2026-05-10",
    type: "vegetable",
    background_color: "#FF6347",
  },
]);
```

---

### Update Pantry Item

**Endpoint**: `pantryApi.updatePantryItem(id, updates)`

**Description**: Updates an existing pantry item.

**Parameters**:
- `id` (string): Pantry item ID
- `updates` (Partial<PantryItem>): Fields to update

**Returns**: `Promise<PantryItem>`

---

### Delete Pantry Item

**Endpoint**: `pantryApi.deletePantryItem(id)`

**Description**: Deletes a pantry item from storage.

**Parameters**:
- `id` (string): Pantry item ID

**Returns**: `Promise<void>`

---

## Base Ingredient API

### Get Base Ingredient by Name

**Endpoint**: `baseIngredientApi.getBaseIngredientByName(name)`

**Description**: Fetches a base ingredient by name with synonyms and categories.

**Parameters**:
- `name` (string): Ingredient name

**Returns**: `Promise<BaseIngredientWithRelations | null>`

**Example**:
```typescript
const ingredient = await baseIngredientApi.getBaseIngredientByName("Tomato");
if (ingredient) {
  console.log("Found:", ingredient.name);
  console.log("Categories:", ingredient.categories);
}
```

---

### Get Base Ingredients by Names

**Endpoint**: `baseIngredientApi.getBaseIngredientsByNames(names)`

**Description**: Fetches multiple base ingredients by name in a single batch.

**Parameters**:
- `names` (string[]): Array of ingredient names

**Returns**: `Promise<Map<string, BaseIngredientWithRelations>>`

**Example**:
```typescript
const ingredients = await baseIngredientApi.getBaseIngredientsByNames([
  "Tomato",
  "Onion",
  "Garlic",
]);
```

**Note**: This method uses parameterized queries to prevent SQL injection.

---

## Meal Plan API

### Get Calendar Meal Plans

**Endpoint**: `useCalendarMealPlans(startDate, endDate)`

**Description**: Fetches meal plans for a date range.

**Parameters**:
- `startDate` (Date): Start date
- `endDate` (Date): End date

**Returns**: 
```typescript
{
  data: MealPlanItemWithRecipe[];
  isLoading: boolean;
  error: Error | null;
}
```

**Example**:
```typescript
const { data: mealPlans } = useCalendarMealPlans(
  new Date("2026-05-01"),
  new Date("2026-05-07")
);
```

---

### Add to Meal Plan

**Endpoint**: `useAddToMealPlan().mutateAsync(item)`

**Description**: Adds a recipe to the meal plan.

**Parameters**:
- `item` (MealPlanItem): Meal plan item with date, meal slot, and recipe

**Returns**: `Promise<MealPlanItem>`

**Example**:
```typescript
const addToMealPlan = useAddToMealPlan();
await addToMealPlan.mutateAsync({
  date: new Date("2026-05-01"),
  mealSlot: "dinner",
  servings: 4,
  recipeId: "recipe-123",
});
```

---

## Authentication API

### Sign In with Email

**Endpoint**: `auth.signInWithEmail(credentials)`

**Description**: Signs in a user with email and password.

**Parameters**:
```typescript
{
  email: string;
  password: string;
}
```

**Returns**: 
```typescript
Promise<{
  success: boolean;
  user?: User;
  session?: AuthSession;
  error?: AppError;
}>
```

**Rate Limiting**: 5 attempts per 5 minutes per email

**Password Requirements**:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Example**:
```typescript
const result = await auth.signInWithEmail({
  email: "user@example.com",
  password: "SecurePass123!",
});

if (result.success) {
  console.log("Signed in as:", result.user.email);
}
```

---

### Sign Up with Email

**Endpoint**: `auth.signUpWithEmail(credentials)`

**Description**: Creates a new user account.

**Parameters**:
```typescript
{
  email: string;
  password: string;
}
```

**Returns**: 
```typescript
Promise<{
  success: boolean;
  user?: User;
  session?: AuthSession | null; // null if email confirmation required
  error?: AppError;
}>
```

**Rate Limiting**: 5 attempts per 5 minutes per email

**Example**:
```typescript
const result = await auth.signUpWithEmail({
  email: "user@example.com",
  password: "SecurePass123!",
});

if (result.success) {
  console.log("Account created for:", result.user.email);
}
```

---

### Sign Out

**Endpoint**: `auth.signOut()`

**Description**: Signs out the current user and clears session.

**Returns**: `Promise<void>`

**Example**:
```typescript
await auth.signOut();
```

---

### Sign In with Provider (OAuth)

**Endpoint**: `auth.signInWithProvider(config)`

**Description**: Initiates OAuth sign-in with a social provider.

**Parameters**:
```typescript
{
  provider: "google" | "apple";
  redirectUrl?: string; // Optional custom redirect URL
  scopes?: string[];
}
```

**Returns**: `Promise<AuthResult>`

**Redirect URL Validation**: Only allows schemes: `cookkit`, `recipe-app`, `exp`, `https`
- HTTPS domains: `cookkit.app`, `auth.cookkit.app`

**Example**:
```typescript
const result = await auth.signInWithProvider({
  provider: "google",
  scopes: ["email", "profile"],
});

if (result.success) {
  console.log("OAuth initiated");
}
```

---

## Data Types

### Recipe

```typescript
interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  difficultyStars?: number;
  servings?: number;
  sourceUrl?: string;
  calories?: number;
  tags?: string[];
  instructions: RecipeInstruction[];
  ingredients: RecipeIngredient[];
}
```

### PantryItem

```typescript
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: string;
  type?: string;
  background_color?: string;
  categories?: PantryCategory[];
  synonyms?: IngredientSynonym[];
}
```

### MealPlanItem

```typescript
interface MealPlanItem {
  id: string;
  date: Date;
  mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
  servings: number;
  recipeId: string;
}
```

---

## Error Handling

All API methods use consistent error handling with `AppResult` type:

```typescript
interface AppResult<T, E> {
  success: boolean;
  data?: T;
  error?: E;
}
```

For result-based methods that don't throw:
```typescript
const result = await recipeApi.fetchAllRecipesResult();
if (result.isErr()) {
  console.error("Error:", result.error);
  return;
}
const recipes = result.value;
```

---

## Performance Guidelines

1. **Use pagination for recipe lists**: Always use `fetchRecipesPaginated` instead of `fetchAllRecipes`
2. **Batch operations**: Use batch methods like `getBaseIngredientsByNames` for multiple items
3. **Caching**: React Query handles caching automatically with appropriate staleTime
4. **Optimistic updates**: Mutations update cache immediately for responsive UI

---

## Security Notes

- All inputs are sanitized to prevent injection attacks
- Rate limiting is enforced on authentication endpoints
- Redirect URLs are validated against a whitelist
- Sensitive data is filtered from logs before sending to external services
- Passwords must meet strong complexity requirements
