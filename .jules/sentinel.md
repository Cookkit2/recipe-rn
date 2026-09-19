## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-14 - Prevent Supabase ilike Wildcard Injection
**Vulnerability:** User string input was passed directly into `.ilike("field", name)` in `BaseIngredientApi`.
**Learning:** In PostgREST/Supabase, `ilike` treats `%`, `_`, and `\` as wildcards. Unsanitized input allows wildcard injection, bypassing expected query filters or potentially causing a slow regex DoS due to expensive full-table matching.
**Prevention:** Always escape these specific characters in user input using `.replace(/[%_\\\\]/g, "\\\\$&")` before passing them into `.like()` or `.ilike()` filters, while leaving legitimate SQL operations parameterized.
