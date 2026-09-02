## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-02 - Prevent Wildcard Injection in Supabase ILIKE Queries
**Vulnerability:** User input passed directly to  or  methods in PostgREST is vulnerable to wildcard injection if special characters (%, _, \) are not escaped.
**Learning:** Postgres `ILIKE` evaluates '%' and '_' as wildcards, and '\' as an escape character. Passing unsanitized input allows attackers to execute broad pattern matching or cause slow query DoS.
**Prevention:** Always sanitize user input intended for exact-match ILIKE queries by escaping these characters (e.g., using `str.replace(/[%_\]/g, "\$&")`).
## 2025-02-26 - Prevent Wildcard Injection in Supabase ILIKE Queries
**Vulnerability:** User input passed directly to `.ilike()` or `.like()` methods in PostgREST is vulnerable to wildcard injection if special characters (%, _, \) are not escaped.
**Learning:** Postgres `ILIKE` evaluates '%' and '_' as wildcards, and '\' as an escape character. Passing unsanitized input allows attackers to execute broad pattern matching or cause slow query DoS.
**Prevention:** Always sanitize user input intended for exact-match ILIKE queries by escaping these characters (e.g., using `str.replace(/[%_\\]/g, "\\$&")`).
