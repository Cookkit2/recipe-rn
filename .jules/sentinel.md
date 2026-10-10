## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-05-03 - SQL Injection wildcards
**Vulnerability:** Input sanitization for database missed escaping the `*` character, which behaves as a wildcard (alias for `%`) in Supabase/PostgREST applications.
**Learning:** PostgREST's `ilike` and `like` handlers consider both `%` and `*` as wildcards, meaning unsanitized `*` can lead to denial of service or unexpected query results when used in user input search terms.
**Prevention:** When escaping wildcards for database text search (specifically LIKE/ILIKE operations in Supabase/PostgREST), always escape `*` alongside `%` and `_`.
