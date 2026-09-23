## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-26 - Fix PostgREST Wildcard Injection
**Vulnerability:** Supabase/PostgREST uses `*` as an alias for `%` in `.ilike()` queries, enabling wildcard injection if inputs are not fully escaped.
**Learning:** Passing user input directly to `.ilike()` without escaping `%`, `_`, `*`, and `\` risks denial of service or unexpected data exposure via full table scans.
**Prevention:** Always sanitize string inputs passed to `.like()` or `.ilike()` by escaping `[%_*\]` using `replace(/[%_*\]/g, "\$&")`.
