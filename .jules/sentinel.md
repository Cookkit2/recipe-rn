## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2026-10-08 - Fix Supabase ILIKE wildcard injection
**Vulnerability:** The '*' character was not escaped in inputs used for Supabase 'ilike' queries, allowing attackers to use it as a wildcard.
**Learning:** In Supabase/PostgREST, '*' acts as an alias for the '%' wildcard, bypassing standard sanitization that only targets '%' and '_'.
**Prevention:** Always escape '*' alongside '%', '_', and '\' when sanitizing inputs for '.ilike()' or '.like()' queries.
