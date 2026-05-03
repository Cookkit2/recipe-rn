# `app/` — Expo Router

## Package identity

File-based routes and layouts for Cookkit (Expo Router ~55). Colocated route components, auth group, recipe/ingredient stacks, onboarding, and profile sections.

## Setup & run

From repo root:

```bash
bun install
bun run dev          # expo start -c
bun run ios          # expo run ios
bun run android      # expo start -c --android
bun run web          # expo start -c --web
bun run typecheck && bun test
```

## Patterns & conventions

- **Default exports** for route files (Expo Router convention), e.g. `export default function SignInScreen` in `app/(auth)/sign-in.tsx`.
- **Layouts**: nested `_layout.tsx` files (e.g. `app/recipes/[recipeId]/_layout.tsx`, `app/(auth)/_layout.tsx`).
- **Auth routes**: use `~/auth` (`useAuth`, providers wired from root layout), shared UI from `~/components/auth`, primitives from `~/components/ui/*` — see `app/(auth)/sign-in.tsx`.
- **Global entry**: `app/_layout.tsx` wraps providers (Query, gestures, Uniwind, Sentry, notifications); prefer adding **providers here** rather than duplicating per-screen.
- **✅ DO**: Add new screens under `app/` with colocated `_layout` when you need a stack or tabs.
- **❌ DON’T**: Add new primary flows under `src/screens/` — that tree is legacy/unwired; canonical auth UX is `app/(auth)/` (contrast with `src/screens/auth/LoginScreen.tsx`).

## Touch points / key files

- Root layout & provider stack: `app/_layout.tsx`
- Auth stack: `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`
- Home & recipe flows: `app/index.tsx`, `app/recipes/[recipeId]/index.tsx`, `app/recipes/[recipeId]/edit.tsx`
- Not found: `app/+not-found.tsx`

## JIT index hints

```bash
rg -n "export default function" app/
rg -n "Stack\.Screen|Tabs" app/
rg -n "useRouter|router\.push" app/
```

## Common gotchas

- **Dynamic imports** in large routes (e.g. `app/recipes/[recipeId]/edit.tsx`) exist for lazy-loading DB modules; follow the existing pattern when touching those paths.
- **Web vs native**: `Platform.OS` checks sometimes live in route files; keep platform forks minimal and push shared logic to `hooks/` or `data/`.

## Pre-PR checks

```bash
bun run typecheck && bun run lint && bun test
```
