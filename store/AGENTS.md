# `store/` — React contexts & Query provider

## Package identity

Long-lived **React contexts** for cooking flows, pantry, meal-plan calendar, timers, and recipe detail state. Also hosts **`QueryProvider.tsx`** wrapping **TanStack Query** for the whole app (imported from `app/_layout.tsx`).

## Setup & run

```bash
bun install
bun run typecheck
bun test
```

## Patterns & conventions

- **Query boundary**: configure React Query in `store/QueryProvider.tsx` — adjust defaults (staleTime, retries) here instead of per-hook unless there is a documented exception.
- **Feature contexts**: one context per domain file (`RecipeContext.tsx`, `PantryContext.tsx`, `TimerContext.tsx`, `MealPlanCalendarContext.tsx`, etc.) exporting a provider + hook pair.
- **✅ DO**: Mirror the provider composition style used in `app/_layout.tsx` when introducing a new global context (narrow scope; avoid prop drilling across unrelated tabs).
- **❌ DON’T**: Duplicate React Query `QueryClientProvider` trees — single provider from `store/QueryProvider.tsx` only.

## Touch points / key files

- React Query wrapper: `store/QueryProvider.tsx`
- Cooking / steps: `store/RecipeStepsContext.tsx`, `store/RecipeDetailContext.tsx`
- Pantry & ingredient flows: `store/PantryContext.tsx`, `store/CreateIngredientContext.tsx`, `store/IngredientDetailContext.tsx`
- Timers: `store/TimerContext.tsx`
- Scaling UI: `store/RootScaleContext.tsx`

## JIT index hints

```bash
rg -n "createContext|useContext" store/
rg -n "QueryClient|QueryClientProvider" store/
```

## Common gotchas

- **Provider order**: `app/_layout.tsx` nests GestureHandler, SafeArea, Uniwind, Query, Keyboard — new providers should respect keyboard and gesture boundaries (consult existing ordering before inserting).

## Pre-PR checks

```bash
bun run typecheck && bun run lint
```
