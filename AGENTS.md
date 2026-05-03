# Cookkit — agent guide (root)

## Project snapshot

Single-package **Expo SDK 55** app (React Native 0.83, React 19) with **expo-router**, **WatermelonDB** (offline), **Supabase** (auth/sync), **TanStack Query**, **Uniwind/Tailwind v4**. Product name in `package.json`: `cookkit`. **Nearest `AGENTS.md` wins**: when editing under a subfolder, read that folder’s `AGENTS.md` first.

## Root setup commands

```bash
pnpm install
pnpm run dev              # Expo dev server (clears cache)
pnpm run typecheck        # tsc --noEmit
pnpm run lint             # Prettier --check + typecheck
pnpm run lint:fix         # Prettier --write
pnpm test                 # Jest (Node, ts-jest)
pnpm run test:coverage    # Jest with coverage (see jest.config.js globs)
```

Platform targets: `pnpm run android`, `pnpm run ios`, `pnpm run web` (see `package.json`).

## Universal conventions

- **TypeScript**: `strict`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess` (`tsconfig.json`).
- **Imports**: use top-of-file imports only; path alias `~/` → repo root (`tsconfig.json` + `babel.config.js`).
- **Exhaustive switches**: handle all members for TS unions/enums (no silent fall-through).
- **Workflow**: Planner/Executor notes live in `.cursor/scratchpad.md` — plan first, one executor step at a time when using that flow.
- **TDD**: add or extend tests in `**/__tests__/**/*.test.ts(x)` when fixing bugs or adding logic covered by Jest.
- **Formatting**: Prettier (+ `prettier-plugin-tailwindcss`). Pre-commit runs `pnpm run typecheck && pnpm run lint` (`.husky/pre-commit`).

## Security & secrets

- Never commit secrets. Copy `.env.example` → `.env` locally; see `config/.env.template` if needed.
- Client-visible keys use the `EXPO_PUBLIC_*` prefix (Supabase, Sentry, RevenueCat, etc.) — treat as **public**; no private API keys in app code.
- Avoid logging PII; Sentry PII flags are documented in `.env.example`.

## JIT index — directory map

| Area                       | Path          | Detail                                       |
| -------------------------- | ------------- | -------------------------------------------- |
| Routes & layouts           | `app/`        | [app/AGENTS.md](app/AGENTS.md)               |
| UI & design tokens         | `components/` | [components/AGENTS.md](components/AGENTS.md) |
| DB, API, domain services   | `data/`       | [data/AGENTS.md](data/AGENTS.md)             |
| React Query & data hooks   | `hooks/`      | [hooks/AGENTS.md](hooks/AGENTS.md)           |
| Auth (Supabase strategy)   | `auth/`       | [auth/AGENTS.md](auth/AGENTS.md)             |
| React contexts & providers | `store/`      | [store/AGENTS.md](store/AGENTS.md)           |
| Cross-cutting libraries    | `lib/`        | [lib/AGENTS.md](lib/AGENTS.md)               |
| Pure helpers & parsers     | `utils/`      | [utils/AGENTS.md](utils/AGENTS.md)           |
| Legacy / parallel auth UI  | `src/`        | [src/AGENTS.md](src/AGENTS.md)               |

### Quick find (repo root)

```bash
rg -n "functionName" app components data hooks auth store lib utils
rg -n "export default function" app/
rg -n "export function use" hooks/
rg -n "class .*Repository" data/db/repositories
rg -n "from \"~/" app/ components/ hooks/
```

### Jest notes

- Mapper: `^~/(.*)$` → `<rootDir>/$1` (`jest.config.js`).
- Mocks: `test/mocks/expo-constants.ts`, `test/mocks/sentry-react-native.ts`.
- `@sentry/react-native` is ESM-heavy; keep mocks/mappers aligned when upgrading.

## Definition of done

- `pnpm run typecheck` and `pnpm run lint` pass (matches Husky).
- `pnpm test` passes for affected code; extend `__tests__` when Jest covers your change.
- New screens/routes live under `app/` with patterns from [app/AGENTS.md](app/AGENTS.md), not under legacy `src/screens/`.

## Learned preferences (maintenance)

- Include useful **debug output** when sharing command results or repro steps.
- **Read files before editing**; keep diffs focused on the task.
- If npm/pnpm reports dependency vulnerabilities, run **`npm audit`** first (per team preference), then address or document.
- When asked to handle many open GitHub PRs, prefer consolidating them into one review PR and closing/superseding the originals after confirmation.

## Learned Workspace Facts

- `@shopify/react-native-skia` needs its postinstall binaries present before iOS prebuild/pod install; with Bun, trust the package so the Skia iOS `.xcframework` files are downloaded.
- WatermelonDB `database.batch` should receive operation arrays directly instead of spread arguments to avoid large-batch runtime warnings.
