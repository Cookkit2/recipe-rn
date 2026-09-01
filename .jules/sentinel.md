## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-15 - Wildcard Injection in Supabase ilike
**Vulnerability:** User inputs passed directly to Supabase `.ilike()` method can act as wildcards (`%`, `_`, `*`, `?`, `\`), allowing unauthorized pattern matching and slow query DoS.
**Learning:** Supabase / PostgREST inherently evaluates these characters as wildcards in LIKE/ILIKE queries unless escaped.
**Prevention:** Always sanitize inputs meant for exact-match `.ilike()` or `.like()` lookups by escaping these characters (e.g., using `replace(/[%_*?\\]/g, "\\$&")`).
