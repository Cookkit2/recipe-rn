## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-24 - Fix Supabase Wildcard Injection
**Vulnerability:** PostgREST `.ilike()` and `.like()` methods are vulnerable to wildcard injection when given unsanitized input because it supports `*`, `%`, `_`, and `\`. This can cause unauthorized pattern matching or slow query DoS attacks.
**Learning:** Supabase uses PostgREST which explicitly supports `*` as an alias for `%`. Direct user input to `ilike` can allow wildcard attacks.
**Prevention:** Always escape `%`, `_`, `\`, and `*` from user inputs using `str.replace(/[%_\\*]/g, "\\$&")` before passing to `.ilike()` or `.like()` methods, and ensure the type is checked before calling `.replace()`.
