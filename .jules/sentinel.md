## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-24 - PostgREST Wildcard Injection
**Vulnerability:** Unsanitized user input passed directly to `.ilike()` or `.like()` methods in Supabase/PostgREST.
**Learning:** PostgREST explicitly supports `*` as an alias for the `%` wildcard, in addition to standard PostgreSQL wildcards `%` and `_`.
**Prevention:** Always sanitize inputs by escaping `%`, `_`, `\`, and `*` (e.g., using `str.replace(/[%_\\*]/g, "\\$&")`) before passing to LIKE/ILIKE filters to prevent unauthorized pattern matching or slow query DoS attacks.
