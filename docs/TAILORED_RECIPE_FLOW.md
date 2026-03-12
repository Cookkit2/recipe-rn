# Tailored Recipe Flow (UI + UX + Data)

## Goal

After a tailored recipe is generated, keep the user on the current screen, animate the transition to indicate the recipe is replaced by the tailored version, and provide a button to view the original recipe.

## Scope

- UI: Recipe details screen
- State: Original vs tailored recipe
- Animation: subtle swap hint
- Controls: add toggle button to view original/tailored

## Proposed UX

1. User taps **Tailor this recipe**.
2. Show loading state on the same screen.
3. When generation completes:
   - Switch to tailored content in place.
   - Run a brief animation (fade + scale) to highlight replacement.
   - Show **View original** button.
4. User can toggle between **Original** and **Tailored** without leaving the screen.

## UI Placement

- **Primary action**: Keep existing **Cook**.
- **Secondary action**: Add **Tailor** button next to **Cook** or below it.
- **Toggle**: Show **View original** only when tailored mode is active, otherwise show **View tailored**.

## State Model

```ts
mode: "original" | "tailored"
baseRecipe: Recipe
initialRecipe: Recipe (loaded from DB)
tailoredRecipe?: Recipe
isTailoring: boolean
```

## Rendering Logic

- If `mode === "original"`: render `baseRecipe`.
- If `mode === "tailored"`: render `tailoredRecipe`.
- Use a memoized `activeRecipe = mode === "tailored" && tailoredRecipe ? tailoredRecipe : baseRecipe`.

## Animation Plan

- Use `react-native-reanimated` already on the screen.
- When `mode` changes:
  - Animate content container:
    - `opacity: 0 → 1`
    - `scale: 0.98 → 1`
  - Optional: show a small “Tailored” badge near the title with a fade-in.

## Data Flow (Tailor)

1. Read pantry items from local DB.
2. Build prompt (system + user + recipe).
3. Call Gemini via existing API wrapper.
4. Validate JSON response.
5. Map to `Recipe` object.
6. Cache tailored recipe.
7. Update `tailoredRecipe` state and switch mode.

## Caching Strategy (suggested)

- Cache by `base_recipe_id + pantry_hash`.
- Prefer a new local table for tailored recipes to avoid mixing with synced recipes.

## Error Handling

- If generation fails: show toast and keep original content.
- If response invalid: retry once with strict JSON reminder.

## Files to Update (planned)

- UI entry point:
  - app/recipes/[recipeId]/index.tsx
- Action bar:
  - components/Recipe/Details/BottomActionBar.tsx
- Tailor service:
  - data/api/recipeApi.ts
- Prompt resource:
  - lib/recipe-tailored/system_prompt.txt (existing)

## Acceptance Criteria

- Tailor button starts generation on current screen.
- Tailored result replaces current recipe with animation.
- Toggle button allows switching between original and tailored.
- No navigation to a new screen.
