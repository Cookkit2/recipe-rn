## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-20 - Secure Supabase .ilike() Inputs
**Vulnerability:** User input passed directly to Supabase's `.ilike()` or `.like()` is vulnerable to wildcard injection because PostgREST implicitly maps `*` to the SQL wildcard `%`.
**Learning:** Unsanitized wildcards (`%`, `_`, `*`) allow attackers to craft expensive queries (similar to ReDoS) and bypass intended application limits.
**Prevention:** Always sanitize inputs to `.ilike()` and `.like()` methods by checking type and escaping `%`, `_`, `*`, and `\` (e.g., `str.replace(/[%_*\]/g, "\$&")`).
