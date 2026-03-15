# Grocery List Unit Conversion & Purchased Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the behavior from PR #55 (unit-aware grocery list aggregation and a dedicated “Purchased” section) into this workspace while preserving the existing, more robust quantity comparison logic.

**Architecture:** Extend the existing `useGroceryList` hook to (1) combine duplicate ingredient quantities across recipes with unit conversion, and (2) route checked items into a new `purchased` category/section. Update the `GroceryListSection` UI component to visually differentiate the `Purchased` section using muted styling without impacting other sections.

**Tech Stack:** React Native (Expo), TypeScript, React Query hooks, existing `unit-converter` and `quantity-comparison` utilities, Tailwind/Uniwind styling.

---

### Task 1: Enhance `useGroceryList` quantities and categories

**Files:**

- Modify: `hooks/queries/useGroceryList.ts`

**Steps:**

- Add a `purchased` variant to the `GroceryCategory` union and `CATEGORY_CONFIG`, and include an empty keyword array for it in `CATEGORY_KEYWORDS`.
- Update `categorizeIngredient` to skip both `other` and `purchased` so ingredients never default to `purchased`.
- Introduce a `combineIngredientWithConversion` helper (mirroring PR #55) that uses `convertToBaseUnit`, `areDimensionsCompatible`, and `roundToReasonablePrecision` to safely merge quantities with different units when aggregating recipe ingredients.
- Use `combineIngredientWithConversion` when aggregating `ingredientMap` so duplicate ingredients across recipes are combined in a unit-aware way.
- When building sections, collect checked items into a separate `purchasedItems` array, emit a `Purchased` section at the end if non-empty, and extend the `categoryOrder` array to include `"purchased"` last.

### Task 2: Update `GroceryListSection` UI for Purchased section

**Files:**

- Modify: `components/GroceryList/GroceryListSection.tsx`

**Steps:**

- Derive an `isPurchased` flag from `section.category === "purchased"`.
- Apply reduced opacity to the outer `Animated.View` when `isPurchased` is true.
- Swap header/title, divider, and item-count colors to muted variants for the Purchased section (e.g., `text-muted-foreground`, `bg-muted-foreground/30`, `text-muted-foreground/70`) while keeping existing styles for other sections.
- Preserve the existing item rendering and item keying (`item.normalizedName`) so behavior and identity remain stable.

### Task 3: Verification

**Files:**

- Source: `hooks/queries/useGroceryList.ts`, `components/GroceryList/GroceryListSection.tsx`

**Steps:**

- Run TypeScript/lint checks focused on the updated files (or the repo’s standard lint command) and fix any new issues.
- Manually test the grocery list in the running app:
  - Create a scenario where the same ingredient appears in multiple recipes with different but compatible units (e.g., cups vs ml) and confirm the total is sensible and covered status matches pantry contents.
  - Check several items off and confirm they move into a trailing “Purchased” section with muted styling, and that unchecking an item moves it back into its original category section.
