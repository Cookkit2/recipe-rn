# Deployment Guide

This doc covers build, OTA updates, environment configuration, and CI/CD automation. For incidents and rollback, see [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).

## Table of Contents

- [Environment Variables](#environment-variables)
- [EAS Build](#eas-build)
- [CI/CD Pipeline](#cicd-pipeline)
- [EAS Update (OTA)](#eas-update-ota)
- [Sentry and Source Maps](#sentry-and-source-maps)
- [Deployment Checklist](#deployment-checklist)

## Environment Variables

Copy [.env.example](../.env.example) to `.env` and fill in values. All `EXPO_PUBLIC_*` variables are baked into the client at build time.

### Required Variables

- **Supabase**: Required for auth and cloud sync.
- **MMKV encryption**: Optional; set for encrypted auth storage (32+ characters).

### Optional Variables

- **Sentry**: Optional; omit to disable error reporting. Use EAS secrets or app config; never commit real DSNs.
- **RevenueCat**: Required for in-app purchases.

### GitHub Secrets for CI/CD

Configure these in your GitHub repository settings:

#### Expo/EAS
- `EXPO_TOKEN` - Expo CLI access token
- `EXPO_APP_ID` - Your Expo app ID

#### iOS
- `APPLE_ID` - Your Apple ID email
- `ASC_APP_ID` - App Store Connect App ID
- `APPLE_TEAM_ID` - Your Apple Developer Team ID

#### Android
- `EXPO_ANDROID_KEYSTORE_BASE64` - Android keystore (base64)
- `EXPO_ANDROID_KEYSTORE_ALIAS` - Keystore alias

For EAS Build, configure secrets in [Expo dashboard](https://expo.dev) (Project → Secrets) or via `eas secret:create`. Use the same variable names as in `.env.example` so that `eas build` injects them.

## EAS Build

The project uses [EAS Build](https://docs.expo.dev/build/introduction/) with config in [eas.json](../eas.json):

- **development**: Dev client, internal distribution.
- **preview**: Production-like, internal (e.g. TestFlight internal testing).
- **production**: Store-ready builds.

### Build Profiles

The `eas.json` configuration includes:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "bundleIdentifier": "com.cookkit.app.staging"
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  }
}
```

### Build Commands

```bash
# Development build
eas build --profile development

# Preview build
eas build --profile preview

# Production builds
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all
```

### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios --profile production

# Google Play Store
eas submit --platform android --profile production
```

## CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

### CI Workflow (.github/workflows/ci.yml)

Runs on every push and pull request:
1. **Quality** - TypeScript check, Prettier formatting
2. **Test** - Jest test suite
3. **Audit** - Dependency security audit

### Deploy Workflow (.github/workflows/deploy.yml)

Triggers:
- Push to `main`/`master` → Production deployment
- Push to `staging` → Staging deployment
- Manual workflow_dispatch

Jobs:
1. **deploy-staging** - Deploys to staging environment
2. **deploy-production** - Deploys to production with blue-green strategy
3. **build-mobile** - Builds iOS and Android apps via EAS
4. **submit-mobile** - Submits apps to app stores

### Manual Deployment

Trigger via GitHub UI:
1. Go to Actions → Deploy workflow
2. Click "Run workflow"
3. Select environment (staging/production)

Or via GitHub CLI:
```bash
gh workflow run deploy.yml -f environment=production
```

## EAS Update (OTA)

JavaScript-only updates can be shipped with [EAS Update](https://docs.expo.dev/eas-update/introduction/) so users get fixes without a new store build.

### Publishing Updates

```bash
# Publish to production channel
eas update --branch production --message "Fix login bug"

# Publish to staging channel
eas update --branch staging --message "Test new feature"
```

### Update Channels

Configure update channels in your CI or release process:
- `production` - Production updates (requires approval)
- `staging` - Staging updates (auto-publish)

Rollback: see [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md#rollback).

## Sentry and Source Maps

For readable stack traces in Sentry, upload source maps during the build.

### Setup

1. Set `SENTRY_AUTH_TOKEN` in EAS secrets
2. Create token in Sentry → Settings → Auth Tokens
3. The native build steps use it for `@sentry/react-native` uploads

**Do not commit the token**; see [SENTRY_SETUP.md](SENTRY_SETUP.md).

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security audit clean
- [ ] Dependencies up to date
- [ ] Changelog updated
- [ ] Version numbers incremented
- [ ] Environment variables configured
- [ ] Backup created (production)

### Post-Deployment
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Build Verification
- [ ] iOS build successful
- [ ] Android build successful
- [ ] App store submission successful
- [ ] No critical errors in logs

## Troubleshooting

### Common Issues

**Build fails with certificate error**
- Verify iOS certificates are valid
- Check provisioning profile matches bundle ID
- Regenerate certificates if expired

**EAS build timeout**
- Check build logs for specific errors
- Ensure `eas.json` configuration is correct
- Try building locally first

**App store submission rejected**
- Review app store guidelines
- Check metadata and screenshots
- Verify compliance with privacy policies

## Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [SECURITY.md](../SECURITY.md) - Security policies
- [API_REFERENCE.md](./API_REFERENCE.md) - API documentation
