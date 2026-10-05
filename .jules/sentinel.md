## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-05-04 - PostgREST Wildcard Injection
**Vulnerability:** User input containing `*` passed to Supabase `.ilike()` was treated as a `%` wildcard because PostgREST aliases `*` to `%`.
**Learning:** Standard SQL wildcard escaping (`%`, `_`) is insufficient in PostgREST environments where `*` acts as an undocumented wildcard alias.
**Prevention:** Always escape `*` alongside `%`, `_`, and `\` in input sanitization utilities intended for PostgREST/Supabase queries.
