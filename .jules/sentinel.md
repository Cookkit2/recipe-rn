## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-10-17 - Fix Supabase Wildcard Injection
**Vulnerability:** User input passed to Supabase `.ilike()` was not properly escaped, leaving it vulnerable to wildcard injection using `%` and `_`.
**Learning:** PostgREST does not support escaping `*` and `?`, only `%` and `_`. Attempting to escape `*` causes literal matches to fail.
**Prevention:** Sanitize input for `.ilike()` using `name.replace(/[%_\\]/g, "\\$&")`, ensuring `*` is omitted.
