## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-26 - Prevent PostgREST Wildcard Injection in ilike queries
**Vulnerability:** User input passed directly to `.ilike()` or `.like()` methods is vulnerable to wildcard injection, allowing attackers to manipulate queries via unescaped % or _ characters.
**Learning:** Supabase / PostgREST queries using `.ilike()` need manual escaping of wildcards to ensure user input is treated as literal strings.
**Prevention:** Sanitize inputs using `str.replace(/[%_*\\]/g, "\\$&")` to escape `%`, `_`, `*`, and `\` before passing them to `.ilike()` or `.like()`.
