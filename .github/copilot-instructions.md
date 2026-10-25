# Cookkit coding instructions

Read the root `AGENTS.md` and the nearest directory `AGENTS.md` before editing. They are the authoritative project guide; this file is a short entry point.

- Use Bun with the version in `package.json`; preserve `bun.lockb` and its security patches.
- Run `bun run typecheck`, `bun run lint`, and affected Jest tests with `bun run test -- --watchman=false --runInBand`.
- Use Expo Router screens in `app/`, shared primitives in `components/ui/`, and Uniwind/Tailwind styling from `global.css`.
- Use WatermelonDB for offline data, Supabase for cloud auth/sync, and TanStack Query hooks for UI data access. Follow each directory's existing patterns.
- Check `app/_layout.tsx` for the current provider chain and auth strategy wiring before changing authentication.
- Use top-of-file TypeScript imports and the `~/` alias. Extend existing regression tests when changing logic.
- Never commit secrets or log personal data. Client `EXPO_PUBLIC_*` values are bundled into the app and must not contain private keys.
