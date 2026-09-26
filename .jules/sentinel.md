## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-26 - Prevent Wildcard Injection in Supabase

**Vulnerability:** User input passed to Supabase's `.ilike()` was vulnerable to wildcard injection because PostgreSQL wildcard characters (`%`, `_`) and PostgREST wildcards (`*`, `?`) were not escaped, allowing DoS or unexpected data matching.
**Learning:** `ilike` and `like` queries on Supabase/PostgREST need explicit sanitization of special characters (`%`, `_`, `*`, `?`, `\`) before the API call to treat user input as literals rather than patterns. When recording this in the journal, remember to append (`>>`) rather than overwrite (`>`).
**Prevention:** Always use a sanitization helper function like `str.replace(/[%_*?\\]/g, "\\$&")` when passing dynamic user strings to `.like()` or `.ilike()`.
