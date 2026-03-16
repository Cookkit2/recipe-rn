## Learned User Preferences

- Follow the Planner/Executor workflow in `.cursor/scratchpad.md` (plan first, then execute one step at a time, updating progress sections).
- Use TDD when implementing features/bugfixes: write tests before implementation when practical.
- Include debugging information in program output when sharing results.
- Read files before editing them.
- When terminal vulnerability warnings appear, run `npm audit` first.

## Learned Workspace Facts

- Keep imports at the top of files; avoid inline imports.
- Use exhaustive `switch` handling for TypeScript unions/enums.
- Jest runs in Node with `ts-jest`; path alias `~/(.*)` maps to `<rootDir>/$1`.
- `@sentry/react-native` ships ESM; Jest may need a mock/mapper to avoid parsing ESM in `node_modules`.
