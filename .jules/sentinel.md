## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-05-03 - Supabase PostgREST Wildcard Injection
**Vulnerability:** User input passed directly to `.ilike()` without escaping allowed for wildcard injection (`%`, `_`, `\`).
**Learning:** Supabase / PostgREST translates `.ilike()` directly to SQL `ILIKE`. Even when parameterized, wildcard characters act as wildcards in the search pattern, which can lead to unauthorized pattern matching or slow query DoS.
**Prevention:** Always escape wildcard characters (`%`, `_`, `\`) using `.replace(/[%_\\]/g, "\\$&")` before passing user input to `.ilike()` or `.like()` when an exact substring or exact match is intended without user-provided wildcards.
