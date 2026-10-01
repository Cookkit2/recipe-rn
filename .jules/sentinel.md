## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-27 - Escaping SQL Wildcards to Prevent Wildcard Injection
**Vulnerability:** Unescaped user input used in Supabase/PostgREST `.ilike()` and `.like()` queries allowed SQL wildcard injection (using `%` and `_`).
**Learning:** PostgREST does not automatically escape `%`, `_`, or `\` in LIKE/ILIKE query methods. This allows attackers to perform wildcard injection, leading to unintended excessive data access, bypassing intended filters, or potential Denial of Service (DoS).
**Prevention:** Always escape `%`, `_`, and `\` characters in user inputs using a string `.replace(/[%_*\\]/g, "\\$&")` before passing them to `.ilike()` or `.like()` methods in Supabase.
