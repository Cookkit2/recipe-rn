## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-28 - PostgREST Wildcard Injection
**Vulnerability:** Input passed directly to PostgREST's `.ilike()` or `.like()` methods without escaping `*`. PostgREST treats `*` as a wildcard alias for `%`.
**Learning:** In Supabase/PostgREST projects, `*` must be escaped along with `%`, `_`, and `\` to prevent wildcard injection. `?` is not a wildcard and does not need to be escaped.
**Prevention:** Always escape `%`, `_`, `*`, and `\` using `.replace(/[%_*\\]/g, "\\$&")` for inputs to `.ilike()` or `.like()`. Update global sanitization utilities to handle `*`.
