## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2024-03-05 - Fix Supabase Wildcard Injection
**Vulnerability:** Supabase API calls passing user input directly to `.ilike()` without escaping wildcard characters (%, _, \).
**Learning:** PostgREST's `ilike` and `like` evaluate wildcards. Unescaped inputs can cause unauthorized pattern matching or allow slow-query DoS attacks.
**Prevention:** Always escape user input before passing it to `.ilike()` or `.like()` queries using `str.replace(/[%_\\]/g, "\\$&")`.
