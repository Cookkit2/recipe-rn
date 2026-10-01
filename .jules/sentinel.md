## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-27 - Wildcard Injection in Supabase ILIKE queries
**Learning:** In Supabase/PostgREST projects, passing user input directly to `.ilike()` or `.like()` methods exposes the application to wildcard injection because PostgREST implicitly supports `*` as an alias for `%`.
**Action:** Always sanitize user inputs passed to `ilike`/`like` by explicitly verifying type (`if (typeof str !== 'string') return str;`) and escaping `%`, `_`, `\`, and `*` using `str.replace(/[%_*\\]/g, "\\$&")` before issuing the query.
## 2026-09-19 - Wildcard Injection in Supabase ILIKE queries
**Vulnerability:** Unsanitized user input passed directly to `.ilike()` or `.like()` methods exposes the application to wildcard injection because PostgREST implicitly supports `*` as an alias for `%`.
**Learning:** PostgREST query methods implicitly map standard wildcard characters.
**Prevention:** Always sanitize user inputs passed to `ilike`/`like` by explicitly escaping `%`, `_`, `\`, and `*` using `str.replace(/[%_*\\]/g, "\\$&")` before issuing the query.
