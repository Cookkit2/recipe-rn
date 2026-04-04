# `hooks/` — React hooks & TanStack Query

## Package identity

Client-side data orchestration: **TanStack Query** hooks under `hooks/queries/` (recipes, favorites, meal plan, etc.), shared query keys, and miscellaneous UI/speech/voice hooks at `hooks/` root. Works with `~/data/api/*` and `~/data/db/DatabaseFacade.ts`.

## Setup & run

```bash
pnpm install
pnpm run typecheck
pnpm test -- hooks/
```

## Patterns & conventions

- **Query keys**: centralize in `hooks/queries/recipeQueryKeys.ts` (and sibling key files) — always key mutations off the same factories to avoid cache bugs.
- **Query hooks**: `useQuery` / `useMutation` + stable `queryFn` references; see `hooks/queries/useRecipeQueries.ts` and `hooks/queries/useFavorites.ts`.
- **✅ DO**: Add new server-backed reads as `useQuery` hooks next to related keys in `hooks/queries/`, following `useRecipes()` / `useRecipe(id)` in `useRecipeQueries.ts`.
- **❌ DON’T**: Import `~/data/api/*` from normal user-facing routes — expose TanStack Query hooks instead (see `app/import-youtube.tsx` using `~/hooks/queries/useYouTubeRecipeQueries`). **`app/debug.tsx` may call APIs/facades directly** for diagnostics; don’t treat that as the pattern for feature screens.

## Touch points / key files

- Recipe list/detail/search: `hooks/queries/useRecipeQueries.ts`
- Favorites: `hooks/queries/useFavorites.ts`
- Query keys: `hooks/queries/recipeQueryKeys.ts`
- Versioning helper: `hooks/useRecipeVersioning.ts`
- Recommendation strategies consumed by queries: `hooks/recommendation/` (imported from `useRecipeQueries.ts`)

## JIT index hints

```bash
rg -n "export function use" hooks/
rg -n "useQuery|useMutation|useQueryClient" hooks/queries
rg -n "queryKey" hooks/queries
```

## Common gotchas

- **`enabled` flags**: follow `useRecipe` pattern for dependent queries (`enabled: !!id`) to avoid empty fetches.
- **Invalidation**: when adding mutations, update every list/detail key touched — grep for `invalidateQueries` in `hooks/queries/` for examples.

## Pre-PR checks

```bash
pnpm run typecheck && pnpm test -- hooks/
```
