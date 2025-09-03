/**
 * Data Layer Index
 *
 * This module provides access to both storage systems:
 * 1. Key-Value Storage - for app preferences, settings, and simple data
 * 2. Structured Database (WatermelonDB) - for recipes, ingredients, and complex relational data
 */

// === KEY-VALUE STORAGE SYSTEM ===
// Export storage facade and related functionality
export * from "./storage";

// === STRUCTURED DATABASE SYSTEM (WatermelonDB) ===
// Export database facade and all related functionality
export * from "./db";

// === LEGACY/EXISTING DATA UTILITIES ===
// Export existing data utilities for backward compatibility
export * from "./data-utils";
export * from "./dummy-data";
export * from "./dummy-recipes";

// Re-export legacy repositories if needed
export * from "./repositories/base-repository";
export * from "./repositories/recipe-repository";
export * from "./pantry-repository";

// === CONVENIENCE EXPORTS ===
// Make it easy to access the main interfaces
export { storageFacade as storage } from "./storage";
export { databaseFacade as database } from "./db";

// === USAGE EXAMPLES ===
/*

// Key-Value Storage Usage:
import { storage } from '@/data'

// Store simple key-value data
await storage.setAsync('user_preference', { theme: 'dark' })
const preference = await storage.getAsync('user_preference')

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
