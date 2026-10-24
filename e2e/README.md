# Detox E2E (iOS)

Local end-to-end tests use [Detox](https://wix.github.io/Detox/).

## Prerequisites

- Xcode and iOS Simulator (target: **iPhone Air**, **iOS 26.2** — see `detox.config.js`)
- [applesimutils](https://github.com/wix/AppleSimulatorUtils): `brew tap wix/brew && brew install applesimutils`

After changing native Detox wiring, run `npx expo prebuild` (or rebuild iOS) so `@config-plugins/detox` applies.

## Commands

```bash
bun install
cd ios && pod install && cd ..
bun run e2e:fixtures
# other terminal
bun run e2e:build:ios
bun run e2e:test:ios
```

`scripts/e2e-ios-env.sh` sets `EXPO_PUBLIC_E2E=true` and points the embedded bundle at the host fixtures: Nebius `http://127.0.0.1:8787/v1` and Supabase `http://127.0.0.1:54321`. Start `bun run e2e:fixtures` before `e2e:test:ios`. The values are dummy test keys, not credentials.

Environment variable `EXPO_PUBLIC_E2E=true` is set by the scripts so the app can skip onboarding, use the mock auth strategy, and seed a supabase-js session for the assistant tools.

The assistant scenario exercises the real local pantry API and WatermelonDB. After the streamed reply it returns to Home and checks `eggs` / `6 count` in the pantry, then relaunches without deleting app data and checks the item again. The HTTP fixtures provide model responses and cloud metadata; pantry mutations stay on device. Tier A also covers plural allergens and complete ingredient pagination.

**Debug + embedded bundle:** `scripts/e2e-ios-env.sh` forces bundling and restores `ios/.xcode.env.updates` if CocoaPods removed it. That override unsets `SKIP_BUNDLING` when `EXPO_PUBLIC_E2E=true`, so the Debug `.app` includes the JS bundle (with `EXPO_PUBLIC_E2E` inlined) and Detox does not need Metro. Normal Xcode Debug runs without that env still load from Metro.

If `home-screen` (or other E2E IDs) time out, rebuild with `bun run e2e:build:ios` after changing `.xcode.env.updates`.

If Detox reports missing `Detox.framework`, run:

```bash
bunx detox clean-framework-cache && bunx detox build-framework-cache
```

`EXPO_PUBLIC_E2E` is mirrored into `Constants.expoConfig.extra` via root `app.config.js` so embedded Debug bundles still enable mock auth / onboarding bypass without Metro.
