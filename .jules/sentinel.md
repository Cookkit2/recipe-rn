## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-03-01 - PostgREST Wildcard Injection
**Vulnerability:** User input passed directly to PostgREST/Supabase `.ilike()` and `.like()` filters without escaping.
**Learning:** PostgREST evaluates `%`, `_`, `*`, and `\` as wildcards or special characters in LIKE patterns. Passing raw user input allows for wildcard injection, leading to unintended matches or inefficient queries.
**Prevention:** Always sanitize user input before passing it to `like` or `ilike` operations by escaping special characters using a helper function like `str.replace(/[%_*\\]/g, "\\$&")`.
