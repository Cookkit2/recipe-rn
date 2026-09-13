## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-05-18 - Wildcard Injection in Supabase Queries
**Vulnerability:** PostgREST wildcard injection
**Learning:** Supabase uses PostgREST, which supports wildcards like `*` and `?` in `ilike` queries. The `sanitizeForDatabase` function only escaped PostgreSQL wildcards `%` and `_`.
**Prevention:** Escape PostgREST wildcards `*` and `?` alongside PostgreSQL wildcards in `sanitizeForDatabase` by updating the regex to `/[%_*?\]/g`.
