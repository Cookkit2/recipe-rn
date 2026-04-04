# `components/` — UI & feature components

## Package identity

React Native UI for Cookkit: shared primitives under `components/ui/`, feature folders (`Recipe/`, `Pantry/`, `auth/`, etc.), and composed screens parts. Styling uses **Uniwind** + **Tailwind CSS v4** theme tokens from `global.css` (imported in `app/_layout.tsx`).

## Setup & run

```bash
pnpm install
pnpm run dev
pnpm run typecheck
```

No separate build — components ship with the Expo app.

## Patterns & conventions

- **Primitives**: reuse `~/components/ui/*` (`button.tsx`, `text.tsx`, `input.tsx`, `card.tsx`, `typography.tsx`) before adding one-off styles.
- **Feature grouping**: place domain UI in named subfolders (`components/Recipe/`, `components/Pantry/`, `components/Ingredient/`) with shared pieces colocated.
- **Auth UI**: composed pieces in `components/auth/` (`AuthInput.tsx`, `SocialAuthButton.tsx`, barrel `components/auth/index.ts`); screens consume them from `app/(auth)/`.
- **✅ DO**: Follow composition in `app/(auth)/sign-in.tsx` (Text/Button from `~/components/ui/*`, layout from `~/components/auth`).
- **❌ DON’T**: Add more ad-hoc `placeholderTextColor="#..."` / raw hex styling like `components/Recipe/Step/RateRecipeModal.tsx` or `components/auth/AuthInput.tsx` — align new inputs with `~/components/ui/input.tsx` and theme tokens from `global.css`.

## Design system

- **Tokens & fonts**: `global.css` (`@import "tailwindcss"`, `@import "uniwind"`, `@theme` blocks).
- **Component examples**: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/card.tsx`, `components/ui/typography.tsx`.
- **RN primitives**: many wrappers align with `@rn-primitives/*` (see `package.json`); keep API consistent with existing dialog/select patterns in `components/ui/`.

## Touch points / key files

- Auth building blocks: `components/auth/AuthInput.tsx`, `components/auth/SocialAuthButton.tsx`
- Recipe detail chrome: `components/Recipe/Details/BottomActionBar.tsx`
- Search UI: `components/Search/SearchResultPrimitives.tsx`

## JIT index hints

```bash
rg -n "export function [A-Z]" components/
rg -n "from \"~/components/ui" app/ components/
rg -n "uniwind|className=" components/ui
```

## Common gotchas

- **Tailwind class strings**: Prettier runs with `prettier-plugin-tailwindcss` — run `pnpm run lint:fix` after large JSX churn.
- **Portal / overlays**: root uses `@rn-primitives/portal` from `app/_layout.tsx`; modal/dialog components should stay consistent with that stack.

## Pre-PR checks

```bash
pnpm run typecheck && pnpm run lint
```
