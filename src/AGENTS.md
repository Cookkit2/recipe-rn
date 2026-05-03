# `src/` — legacy auth UI & parallel context

## Package identity

Small tree holding an **alternate `AuthContext`** (`src/contexts/AuthContext.tsx`) and **unused Expo Router screens** (`src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx`) that import the legacy context. **New work must not land here.**

## Setup & run

No separate commands — build via root `bun run dev`. Prefer deleting or migrating legacy code when touching auth instead of expanding this folder.

## Patterns & conventions

- **✅ DO**: Use `~/auth` and `app/(auth)/` for all new authentication UX and state (see `app/(auth)/sign-in.tsx` + `auth/AuthContext.tsx`).
- **❌ DON’T**: Add features to `src/contexts/AuthContext.tsx` or `src/screens/auth/*` — they are **not** the app’s active Router entrypoints and will confuse dual-context behavior.

## Touch points / key files (for migration / cleanup only)

- Legacy context: `src/contexts/AuthContext.tsx`
- Legacy screens: `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx`
- DB helper used by legacy code path: `src/services/database/auth-db.ts`
- Alternate store: `src/store/authStore.ts`

## JIT index hints

```bash
rg -n "src/contexts|src/screens|src/store/authStore" .
```

## Pre-PR checks

When deleting or migrating this folder, run full regression:

```bash
bun run typecheck && bun run lint && bun test
```
