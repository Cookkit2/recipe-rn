## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-28 - Supabase/PostgREST Wildcard Injection Risk
**Vulnerability:** User inputs passed directly into Supabase's `.ilike()` and `.like()` methods could contain `*`, `%`, and `_` characters, which are treated as wildcards.
**Learning:** PostgREST accepts both standard SQL wildcards (`%`, `_`) and custom wildcards (`*`). Failure to escape these characters can lead to database enumeration, slow queries, and unexpected matching of multiple rows.
**Prevention:** Always create and use a sanitization helper to escape `%`, `_`, and `*` with a backslash (`\`) before passing user inputs to `.like()` or `.ilike()` functions.
