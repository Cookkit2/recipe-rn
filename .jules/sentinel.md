## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-26 - Fix wildcard injection in ilike queries
**Vulnerability:** The use of `.ilike()` or `.like()` with user input is vulnerable to wildcard injection since PostgREST translates literal `*` to SQL `%`.
**Learning:** Attempting to escape wildcards using `.ilike()` is insufficient for PostgREST. The library also lacks a `.regexIMatch()` method.
**Prevention:** Always use `.filter('column', 'imatch', exactPostgrestPattern(value))` for safe literal matches against user input to prevent wildcard evaluation on the database.
