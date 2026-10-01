## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-27 - Missing Rate Limiting on Password Reset
**Vulnerability:** The password reset endpoint in SupabaseAuthStrategy lacked rate limiting, making it susceptible to email spam and user enumeration attacks.
**Learning:** While login and signup endpoints were protected, password reset was overlooked. High-value authentication endpoints must be universally protected.
**Prevention:** Ensure all authentication and account modification operations are routed through the `checkRateLimit` utility.
