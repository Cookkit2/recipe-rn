## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2024-10-24 - Supabase `.ilike` Wildcard Injection
**Vulnerability:** User input passed directly to Supabase `.ilike()` was vulnerable to wildcard injection (`%`, `_`, etc.).
**Learning:** PostgREST translates `.ilike()` to SQL `ILIKE`, which interprets `%` and `_` as wildcard characters. If user input isn't sanitized, attackers can bypass exact-match constraints.
**Prevention:** Always sanitize user input meant for literal matching in `.ilike()` or `.like()` by escaping wildcards using `.replace(/[%_*?\\]/g, "\\$&")`.
