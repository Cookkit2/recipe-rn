# Incident Response and Runbooks

This document defines severity levels, contacts, and runbooks for common incidents. See also [TROUBLESHOOTING.md](TROUBLESHOOTING.md) and [SENTRY_SETUP.md](SENTRY_SETUP.md).

## Severity Definitions

| Severity          | Description                                                              | Response target                     |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| **P0 / Critical** | App unusable for most users (crashes on launch, auth broken, data loss). | Immediate; page on-call if defined. |
| **P1 / High**     | Major feature broken (e.g. pantry not loading, recipes not opening).     | Within hours.                       |
| **P2 / Medium**   | Degraded experience (slow loads, non-critical feature down).             | Within 1 business day.              |
| **P3 / Low**      | Minor bugs, cosmetic issues.                                             | Backlog.                            |

## Who to Contact

- **On-call / primary**: Define in your team’s runbook (e.g. PagerDuty, Slack channel).
- **Escalation**: Document internally who can approve rollbacks and production changes.

## Runbooks

### App crash spike (P0/P1)

1. Check [Sentry](https://sentry.io/) (or your error dashboard) for the top errors and stack traces.
2. Correlate with recent deploys or EAS updates (see [Rollback](#rollback)).
3. If caused by a recent OTA or build, follow [Bad OTA](#bad-ota-update-p0p1).
4. Fix forward or roll back as appropriate; communicate in status channel if needed.

### Bad OTA update (P0/P1)

1. **EAS Update**: In [Expo dashboard](https://expo.dev), open the project → Updates. Revert to the previous update or disable the broken channel so clients stop receiving it.
2. **Store build**: If the broken release is a new store build, prepare a fix and submit a new build; consider expedited review for critical fixes.
3. Document the incident and add tests or guards to prevent recurrence.

### Supabase down (P0/P1)

1. Check [Supabase status](https://status.supabase.com/) and your project health.
2. App is offline-first: users can continue using local data. Sync will resume when Supabase is back.
3. If the issue is project-specific (e.g. quota, misconfiguration), fix in Supabase dashboard or contact Supabase support.
4. Communicate to users if sync will be delayed (e.g. in-app banner or status page).

### Sentry DSN leak or wrong project (P1/P2)

1. If a real DSN was committed or exposed: rotate the DSN in Sentry project settings (create new DSN, revoke old).
2. Update app config to use the new DSN only via env (e.g. `EXPO_PUBLIC_SENTRY_DSN`) and redeploy.
3. Remove any real DSNs from docs; use placeholders only (see [SENTRY_SETUP.md](SENTRY_SETUP.md)).
4. Review what data was sent to the wrong project and follow your privacy/security process if needed.

## Rollback

### EAS Update (JavaScript bundle only)

- **Who**: Anyone with Expo project access and Update permissions.
- **How**: Expo dashboard → Project → Updates → select previous working update and promote it, or point the channel to that update.
- **Data**: No database or native binary change; rollback is immediate for users on the next app open or refresh.

### Store build (native binary)

- **Who**: Typically release manager or on-call with store and EAS access.
- **How**: Submit a previous known-good build to the store (if allowed by store policy) or ship a new build that reverts the offending native/code change.
- **Data**: Ensure compatibility with existing app data (e.g. WatermelonDB schema); document which build is “last known good” and when.

### Data / schema changes

- Avoid breaking schema changes in a single release. Prefer additive migrations and backward-compatible reads. If a rollback requires DB migration reversal, document the procedure and test it in staging.

## Links

- [Sentry](https://sentry.io/) – Errors and performance
- [Expo EAS](https://expo.dev) – Builds and updates
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Common issues and fixes
