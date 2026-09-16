## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2024-05-20 - [Wildcard Injection in Supabase Queries]
**Vulnerability:** Unsanitized user input passed directly to `.ilike()` and `.like()` methods in Supabase/PostgREST queries.
**Learning:** PostgREST translates `.ilike()` and `.like()` to SQL `ILIKE` and `LIKE` operators, where `%`, `_`, and `*` act as wildcards. If a user inputs these characters, it can cause unintended matches or performance degradation (DoS via expensive wildcard queries).
**Prevention:** Always escape PostgreSQL wildcards (`%`, `_`), PostgREST wildcards (`*`), and backslashes (`\`) in user input before passing them to `.ilike()` or `.like()` methods using `str.replace(/[%_*\\]/g, "\\$&")`. Note that `?` should not be escaped as it causes an invalid escape sequence error in PostgreSQL.
