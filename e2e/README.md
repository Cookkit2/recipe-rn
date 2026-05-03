# Detox E2E (iOS)

Local end-to-end tests use [Detox](https://wix.github.io/Detox/).

## Prerequisites

- Xcode and iOS Simulator (target: **iPhone Air**, **iOS 26.2** — see `detox.config.js`)
- [applesimutils](https://github.com/wix/AppleSimulatorUtils): `brew tap wix/brew && brew install applesimutils`

After changing native Detox wiring, run `npx expo prebuild` (or rebuild iOS) so `@config-plugins/detox` applies.

## Commands

```bash
bun install
bun run e2e:build:ios
bun run e2e:test:ios
```

Environment variable `EXPO_PUBLIC_E2E=true` is set by the scripts so the app can skip onboarding and use the mock auth strategy where configured.

**Debug + embedded bundle:** `ios/.xcode.env.updates` unsets `SKIP_BUNDLING` when `EXPO_PUBLIC_E2E=true`, so the Debug `.app` includes the JS bundle (with `EXPO_PUBLIC_E2E` inlined) and Detox does not need Metro. Normal Xcode Debug runs without that env still load from Metro.

If `home-screen` (or other E2E IDs) time out, rebuild with `bun run e2e:build:ios` after changing `.xcode.env.updates`.

If Detox reports missing `Detox.framework`, run:

```bash
bunx detox clean-framework-cache && bunx detox build-framework-cache
```

`EXPO_PUBLIC_E2E` is mirrored into `Constants.expoConfig.extra` via root `app.config.js` so embedded Debug bundles still enable mock auth / onboarding bypass without Metro.
