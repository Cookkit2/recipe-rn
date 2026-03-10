# Deployment

This doc covers build, OTA updates, and environment configuration. For incidents and rollback, see [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).

## Environment Variables

Copy [.env.example](../.env.example) to `.env` and fill in values. All `EXPO_PUBLIC_*` variables are baked into the client at build time.

- **Supabase**: Required for auth and cloud sync.
- **Sentry**: Optional; omit to disable error reporting. Use EAS secrets or app config; never commit real DSNs.
- **RevenueCat**: Required for in-app purchases.
- **MMKV encryption**: Optional; set for encrypted auth storage.

For EAS Build, configure secrets in [Expo dashboard](https://expo.dev) (Project → Secrets) or via `eas secret:create`. Use the same variable names as in `.env.example` so that `eas build` injects them.

## EAS Build

The project uses [EAS Build](https://docs.expo.dev/build/introduction/) with config in [eas.json](../eas.json):

- **development**: Dev client, internal distribution.
- **preview**: Production-like, internal (e.g. TestFlight internal testing).
- **production**: Store-ready builds.

Commands:

```bash
eas build:configure   # Regenerate eas.json if needed
eas build --profile development
eas build --profile production --platform ios
eas build --profile production --platform android
```

## EAS Update (OTA)

JavaScript-only updates can be shipped with [EAS Update](https://docs.expo.dev/eas-update/introduction/) so users get fixes without a new store build. Configure update channels in your CI or release process. Rollback: see [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md#rollback).

## Sentry and Source Maps

For readable stack traces in Sentry, upload source maps during the build. Set `SENTRY_AUTH_TOKEN` in EAS secrets (create a token in Sentry → Settings → Auth Tokens). The native build steps use it for `@sentry/react-native` uploads. Do not commit the token; see [SENTRY_SETUP.md](SENTRY_SETUP.md).
