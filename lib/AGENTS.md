# `lib/` — native integrations & cross-cutting services

## Package identity

Non-UI modules that sit outside `data/` and `utils/`: **AI services**, **image cache**, **notifications**, **Android navigation bar**, **Sentry wiring**, and similar platform glue.

## Setup & run

```bash
bun install
bun run typecheck
bun test -- lib/
```

## Patterns & conventions

- **Heavy optional deps**: use **dynamic `import()`** inside hooks/services where the repo already does to avoid loading native/ML code on every startup.
- **✅ DO**: Keep native initialization asynchronous and cover platform integrations with test doubles.
- **❌ DON’T**: Add new static imports of large native-only modules at the top of widely-used entry files (e.g. `app/_layout.tsx`) without a lazy-loading strategy — mirror the dynamic import pattern above.

## Touch points / key files

- Image cache init (called from layout): `lib/image-cache.ts`
- Notifications: `lib/notifications` (imported from `app/_layout.tsx`)
- Android nav bar: `lib/android-navigation-bar.ts`

## JIT index hints

```bash
rg -n "await import\(" lib/
rg -n "Sentry|Notifications|expo-" lib/
```

## Common gotchas

- **Jest**: native modules often need mocks or `transformIgnorePatterns` updates (`jest.config.js`) when adding dependencies.
- **TFLite**: `react-native-fast-tflite` paths are sensitive to Metro config — coordinate with `metro.config.js` when adding assets.

## Pre-PR checks

```bash
bun run typecheck && bun test -- lib/
```
