## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-07 - Fix Supabase Wildcard Injection
**Vulnerability:** Unsanitized user inputs passed directly to `.ilike()` or `.like()` in Supabase queries could lead to wildcard injection.
**Learning:** In Supabase/PostgREST projects, user input passed to `.ilike()` is vulnerable if special characters (%, _, \) are not escaped.
**Prevention:** Always sanitize inputs passed to `.ilike()` using `str.replace(/[%_\\]/g, "\\$&")` to prevent unauthorized pattern matching or slow query DoS attacks.
