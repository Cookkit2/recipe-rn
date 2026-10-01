## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-24 - Fix wildcard injection in Supabase ilike queries
**Vulnerability:** User inputs passed directly to Supabase .ilike() allow wildcard injection because PostgREST supports * as an alias for %.
**Learning:** Supabase .ilike() is vulnerable to wildcard injection if inputs are not properly escaped.
**Prevention:** Always escape %, _, \, and * characters using str.replace(/[%_*\\]/g, '\\$&') before passing user input to .ilike().
