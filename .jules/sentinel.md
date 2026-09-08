## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-08 - Wildcard Injection in ilike Queries
**Vulnerability:** User input passed directly to PostgREST .ilike() methods allows wildcard injection.
**Learning:** Supabase .ilike() does not automatically escape wildcards (%, _, \). If user input contains these, it can lead to unintended pattern matching.
**Prevention:** Always sanitize user input passed to .ilike() or .like() by escaping wildcard characters using str.replace(/[%_\\]/g, "\\\$&").
