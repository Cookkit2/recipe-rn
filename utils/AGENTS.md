# `utils/` — pure helpers, logging, parsing

## Package identity

Stateless **helpers** (recipe scaling, ingredient matching, JSON parsing, YouTube helpers, API error handling) and **`utils/logger`**. Most Jest coverage for business logic lives here (`utils/__tests__/`).

## Setup & run

```bash
bun install
bun test -- utils/
bun run typecheck
```

## Patterns & conventions

- **Pure functions** preferred — pass inputs, return results; avoid hidden globals except the shared logger.
- **✅ DO**: Extend patterns in `utils/recipe-scaling.ts`, `utils/ingredient-identity.ts`, and `utils/api-error-handler.ts` with colocated tests in `utils/__tests__/*.test.ts`.
- **❌ DON’T**: Add **new** cross-cutting modules in `utils/` that depend on `~/data` or other app singletons — `utils/voice-cooking.ts` already does this for TTS settings; prefer `lib/` or `hooks/` for new device/storage integration so `utils/` stays mostly pure.

## Touch points / key files

- Logging: `utils/logger.ts` (used across `data/db/database.ts` and services)
- API errors: `utils/api-error-handler.ts` (+ tests `utils/__tests__/api-error-handler.test.ts`)
- Scaling math: `utils/recipe-scaling.ts`
- AI provider integration lives in `lib/ai/` (app client) and `server/` (private Nebius adapter).
- `gemini-api.ts` is retained but disabled with `GEMINI_ENABLED = false`; do not route app calls to it while Nemotron is active.

## JIT index hints

```bash
rg -n "export function" utils/*.ts
ls utils/__tests__
bun test -- utils/__tests__/recipe-scaling.test.ts   # example single file
```

## Common gotchas

- **Logger config**: mind environments (Expo Go vs dev client) when adding transports — follow existing `utils/logger.ts` structure.

## Pre-PR checks

```bash
bun run typecheck && bun test -- utils/
```
