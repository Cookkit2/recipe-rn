## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-26 - Supabase PostgREST ilike Wildcard Injection
**Vulnerability:** User input passed directly to `.ilike()` or `.like()` methods is vulnerable to wildcard injection. Unlike standard PostgreSQL, PostgREST explicitly supports `*` and `?` as wildcards on top of `%` and `_`.
**Learning:** PostgREST parses standard SQL LIKE wildcards `%` and `_`, but also allows `*` (as an alias for `%`) and `?` (as an alias for `_`). An attacker could supply these characters to bypass exact matching or cause slow query DoS.
**Prevention:** Always sanitize inputs by escaping `%`, `_`, `\`, `*`, and `?` using `str.replace(/[%_*?\\]/g, "\\$&")` before passing them to `.ilike()` or `.like()`. Additionally, verify the input type (`typeof str === 'string'`) to prevent runtime errors.
