# `auth/` — authentication strategies & context

## Package identity

App-wide **auth context**, **Zustand store**, and **pluggable strategies** (`SupabaseAuthStrategy`, `MockAuthStrategy`) with **SecureStore/MMKV storage adapters** (`StorageIntegration.ts`). This is the **canonical** auth module — consumed from `app/` via `~/auth`.

## Setup & run

```bash
pnpm install
pnpm run typecheck
pnpm test -- auth/
```

Requires `EXPO_PUBLIC_SUPABASE_*` in `.env` for real Supabase auth (see root `.env.example`).

## Patterns & conventions

- **Public API**: import from `~/auth` only (`auth/index.ts` re-exports hooks, strategies, storage helpers).
- **Context**: `auth/AuthContext.tsx` exposes `useAuth`, `useAuthState`, `useAuthActions` — use these in route screens (see `app/(auth)/sign-in.tsx`).
- **Strategy**: implement `AuthStrategy` (`auth/AuthStrategy.ts`) for new providers; wire selection in the provider where the app chooses Supabase vs mock.
- **Persistence**: `auth/StorageIntegration.ts` bridges Supabase session storage to Expo SecureStore / MMKV-style adapters.
- **✅ DO**: Follow `SupabaseAuthStrategy.ts` for session lifecycle and error mapping; use `AuthStore.ts` for cross-screen state that must persist outside React context.
- **❌ DON’T**: Import `~/src/contexts/AuthContext` or build new screens on `src/screens/auth/*` — that path is a **separate legacy context** (`src/contexts/AuthContext.tsx`) not wired to Expo Router; new work must use `~/auth`.

## Touch points / key files

- Barrel exports: `auth/index.ts`
- Provider + hooks: `auth/AuthContext.tsx`, `auth/AuthStore.ts`
- Supabase: `auth/SupabaseAuthStrategy.ts`
- Tests: `auth/__tests__/StorageIntegration.test.ts`

## JIT index hints

```bash
rg -n "useAuth|AuthProvider" app/ auth/
rg -n "createClient|supabase" auth/
rg -n "AuthStrategy|MockAuth|Supabase" auth/
```

## Common gotchas

- **Secure storage**: failures often surface as sign-in errors — log via project logger patterns, never log tokens.
- **Types**: shared auth types live in `~/types/AuthTypes.ts` (re-exported from `auth/index.ts`).

## Pre-PR checks

```bash
pnpm run typecheck && pnpm test -- auth/
```
