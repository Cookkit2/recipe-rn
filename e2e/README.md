# Detox E2E (iOS)

Local end-to-end tests use [Detox](https://wix.github.io/Detox/).

## Prerequisites

- Xcode and iOS Simulator (default device: **iPhone Air**, newest installed runtime — see `detox.config.js`)
- [applesimutils](https://github.com/wix/AppleSimulatorUtils): `brew tap wix/brew && brew install applesimutils`

Use Bun 1.4.3 and a modern Ruby/CocoaPods toolchain (CI uses macOS 26). System Ruby 2.6 cannot run the current Expo precompiled-module helpers. After changing native wiring, run `EXPO_PUBLIC_E2E=true bunx expo prebuild --platform ios --no-install`, then install the iOS pods.

## Commands

```bash
bun install --frozen-lockfile
bun run e2e:build:ios
bun run e2e:test:ios
```

Environment variable `EXPO_PUBLIC_E2E=true` is set by the scripts so the app can skip onboarding and use the mock auth strategy where configured.

**Debug + embedded bundle:** Every Detox build runs `scripts/prepare-e2e-ios.js` after prebuild. It preserves local overrides and regenerates `ios/.xcode.env.updates`, which unsets `SKIP_BUNDLING` when `EXPO_PUBLIC_E2E=true`, so the Debug `.app` includes the JS bundle (with `EXPO_PUBLIC_E2E` inlined) and Detox does not need Metro. Normal Xcode Debug runs without that env still load from Metro.

If `home-screen` (or other E2E IDs) time out, rebuild with `bun run e2e:build:ios` after changing `.xcode.env.updates`.

If Detox reports missing `Detox.framework`, run:

```bash
bunx detox clean-framework-cache && bunx detox build-framework-cache
```

`EXPO_PUBLIC_E2E` is mirrored into `Constants.expoConfig.extra` via root `app.config.js` so embedded Debug bundles still enable mock auth / onboarding bypass without Metro.

## Coverage and verification

The smoke scenarios cover offline pantry startup, opening search/profile and mock sign-in. They do not cover recipe import, camera, purchase, meal-plan writes or live-backend auth. Add deterministic fixtures before expanding those scenarios.

Choose an installed device/runtime with `DETOX_DEVICE_TYPE` and `DETOX_DEVICE_OS`. Both Debug and Release configurations build the CocoaPods workspace. `bun run test -- --config e2e/jest.config.js --listTests --runInBand` verifies discovery, and `bunx tsc --noEmit --project e2e/tsconfig.json` checks scenario types; neither proves simulator behavior.
