## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2026-08-16 - [Password Reset Rate Limiting]
**Vulnerability:** [Missing rate limiting on password reset endpoint]
**Learning:** [Authentication endpoints like password reset are often missed for rate limiting compared to sign in/up, which could lead to email flooding or user enumeration.]
**Prevention:** [Ensure all authentication-related endpoints, including password reset, have rate limiting applied consistently.]
