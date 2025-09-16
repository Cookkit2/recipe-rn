/**
 * Data Layer Index
 *
 * This module provides access to both storage systems:
 * 1. Key-Value Storage - for app preferences, settings, and simple data
 * 2. Structured Database (WatermelonDB) - for recipes, ingredients, and complex relational data
 */

// === CONVENIENCE EXPORTS ===
// Make it easy to access the main interfaces
export { storageFacade as storage } from "./storage";
export { databaseFacade as database } from "./db";

// === USAGE EXAMPLES ===
/*

// Key-Value Storage Usage:
import { storage } from '@/data'
import { USER_PREFERENCE_KEY } from "~/constants/storage-keys";

// Store simple key-value data
await storage.setAsync(USER_PREFERENCE_KEY, { theme: 'dark' })
const preference = await storage.getAsync(USER_PREFERENCE_KEY)

// Structured Database Usage:
import { database } from '@/data'

// Work with recipes
const recipes = await database.recipes.searchRecipes({ searchTerm: 'pasta' })

// Work with ingredients
const ingredients = await database.ingredients.searchIngredients({ searchTerm: 'tomato' })

// Work with stock/pantry
const stockItems = await database.stock.searchStock({ category: 'vegetables' })

// Complex operations
const availableRecipes = await database.getAvailableRecipes()
const shoppingList = await database.getShoppingListForRecipe(recipeId)

*/
