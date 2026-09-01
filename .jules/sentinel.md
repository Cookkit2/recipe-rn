## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-07-08 - Added Rate Limiting to Password Reset
**Vulnerability:** The `resetPassword` flow in `SupabaseAuthStrategy.ts` lacked rate limiting, whereas other auth flows (sign up, sign in) had it.
**Learning:** This architectural gap happened because password resets were treated differently in the auth strategy API structure without explicit rate limiting applied by default to all entry points.
**Prevention:** Ensure all external-facing authentication triggers—including resets, magic links, and OTPs—have client-side rate limiters applied to complement backend protections and reduce unauthenticated spam.
