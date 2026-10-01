## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-24 - Wildcard Injection in Supabase/PostgREST
**Vulnerability:** User input passed directly to `.ilike()` was vulnerable to wildcard injection.
**Learning:** PostgREST (used by Supabase) natively maps the asterisk (`*`) character to the `%` wildcard for LIKE/ILIKE operations.
**Prevention:** When escaping user input for `.ilike()`, ensure that `*` is escaped alongside `%`, `_`, and `\`. E.g., `str.replace(/[%_*\\]/g, "\\$&")`.
