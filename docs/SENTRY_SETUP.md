# Sentry Integration Guide

## Overview

Cookkit uses Sentry for error tracking, sampled navigation performance traces, and logging. Configure the public DSN before building a production app.

## What Was Fixed

### 1. Logger Integration

- ✅ Uncommented all Sentry logging calls in `utils/logger.ts`
- ✅ Now `log.trace()`, `log.debug()`, and `log.info()` send to Sentry
- ✅ `log.warn()`, `log.error()`, and `log.fatal()` already working

### 2. Test Utilities

- ✅ Added `utils/sentry-test.ts` for testing Sentry integration
- ✅ Added test button in Profile tab (Development mode only)

## Testing Sentry

### Method 1: Use the Test Button

1. Run your app in development mode
2. Go to the **Profile** tab
3. Scroll down to the **Debug Section**
4. Tap **"Test Sentry Integration"**
5. Check your Sentry project dashboard in ~30 seconds (use your project’s URL from Sentry settings; never commit real DSNs to the repo)

### Method 2: Manual Test in Code

```typescript
import { testSentryIntegration } from "~/utils/sentry-test";

// Call this anywhere in your app
testSentryIntegration();
```

### Method 3: Use Logger

```typescript
import { log } from "~/utils/logger";

// These all send to Sentry now:
log.info("User logged in");
log.warn("Low memory warning");
log.error("Failed to load data", { userId: 123 });
```

### Method 4: Direct Sentry Calls

```typescript
import * as Sentry from "@sentry/react-native";

// Capture exception
try {
  throw new Error("Something went wrong");
} catch (error) {
  Sentry.captureException(error);
}

// Capture message
Sentry.captureMessage("User completed onboarding", "info");

// Add breadcrumb
Sentry.addBreadcrumb({
  category: "navigation",
  message: "User navigated to Recipe Details",
  level: "info",
});
```

## Configuration

### Environment Variables

Sentry is configured via environment variables (or `app.json` / `app.config.js` `extra`):

| Variable                      | Description                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SENTRY_DSN`      | Sentry project DSN. Required in the EAS production environment; production builds reject missing or invalid values. |
| `EXPO_PUBLIC_SENTRY_SEND_PII` | Set to `"true"` to enable `sendDefaultPii` (IP, cookies, user context). Default is `false` for privacy.  |

Example `.env`:

```
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@ingest.sentry.io/project-id
# Optional: enable PII for debugging (not recommended in production)
# EXPO_PUBLIC_SENTRY_SEND_PII=true
```

### Runtime Settings (`app/_layout.tsx`)

- **DSN**: From `EXPO_PUBLIC_SENTRY_DSN` or `Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN`
- **sendDefaultPii**: `false` by default; set to `true` only when `EXPO_PUBLIC_SENTRY_SEND_PII=true` (e.g. for debugging)
- **Traces Sample Rate**: 100% in dev, 10% in production (reduces overhead)
- **CPU Profiling**: Not enabled
- **Session Tracking**: Enabled
- **Performance Tracing**: Enabled
- **Slow/frozen frames and JS stalls**: Included in sampled transactions
- **Logs**: Enabled

### Features Enabled

- ✅ Error tracking
- ✅ Performance monitoring
- ✅ Navigation tracking
- ✅ Slow/frozen frames and JS-stall measurements
- ✅ Breadcrumbs
- ✅ Native crash reporting
- ✅ Logs integration

## Troubleshooting

### Sentry Not Receiving Events?

1. **Check if running in Expo Go**
   - Sentry requires a development build (not Expo Go)
   - Your app should show "Using development build" in terminal

2. **Verify initialization**

   ```typescript
   import * as Sentry from "@sentry/react-native";

   const client = Sentry.getClient();
   console.log("Sentry enabled:", !!client);
   ```

3. **Check network**
   - Sentry requires internet connection
   - Events are queued and sent in batches

4. **Wait for events to appear**
   - Events can take 30-60 seconds to appear in dashboard
   - Check Sentry dashboard: <https://sentry.io/>

### Common Issues

**Issue**: "Cannot find module '@sentry/react-native'"

- **Solution**: Run `npm install` or `yarn install`

**Issue**: Events not appearing in Sentry

- **Solution**:
  1. Verify DSN is correct
  2. Check internet connection
  3. Wait 30-60 seconds
  4. Use the test button in Profile tab

**Issue**: "Sentry client is NOT initialized"

- **Solution**: Make sure app is not running in Expo Go

## Production Considerations

### Security and PII

- DSN is safe to expose (client-side only).
- **sendDefaultPii** is `false` by default; keep it off in production unless you need IP/user context for debugging. Enable temporarily via `EXPO_PUBLIC_SENTRY_SEND_PII=true` for incident investigation if required.
- Avoid logging passwords, tokens, or other PII in `log.*` calls; these can be sent to Sentry when logs are enabled.
- **Data scrubbing**: Configure Sentry project settings to scrub sensitive keys (e.g. `password`, `token`, `authorization`) from event payloads. See [Sentry Data Scrubbing](https://docs.sentry.io/product/data-management-settings/scrubbing/).

### Performance

Production trace sampling is 10% to limit overhead on devices; development samples all traces. CPU profiling is not enabled.

### Build configuration

Set `EXPO_PUBLIC_SENTRY_DSN` in the EAS **production** environment. The app config includes this public value in Expo Constants, while `SENTRY_AUTH_TOKEN` remains a build-only credential. An upload token does not enable runtime reporting by itself. Keep `EXPO_PUBLIC_SENTRY_SEND_PII=false` unless you explicitly need and have consent for PII collection.

The iOS Sentry upload phase declares the app's generated DWARF file as an input, so Xcode finishes dSYM generation before uploading. Both application configurations generate dSYMs to keep this dependency valid in Debug builds, where uploads remain skipped. `plugins/withIosSentryDebugSymbols.js` preserves the setup after prebuild; keep it after the Sentry Expo plugin.

Existing TestFlight builds cannot pick up a missing DSN retroactively. Install a new build after updating the production environment and app configuration.

## Alerting and On-Call

- Configure Sentry alerts (e.g. error spike, new issue) in your Sentry project.
- For P0/P1 incidents, ensure alerts route to your on-call or incident channel. See [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) for severity and runbooks.

## Resources

- Sentry project URL: from [Sentry](https://sentry.io/) → your project → Settings → Client Keys (DSN). Use env var `EXPO_PUBLIC_SENTRY_DSN` only; do not commit DSNs.
- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Performance Monitoring](https://docs.sentry.io/platforms/react-native/performance/)
