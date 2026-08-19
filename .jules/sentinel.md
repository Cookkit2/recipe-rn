## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-27 - Supabase ILIKE Injection

**Vulnerability:** User input passed directly to `.ilike()` or `.like()` methods in Supabase queries without escaping special characters (`%`, `_`, `\`). This allows attackers to perform unintended wildcard searches, potentially bypassing access controls or causing Denial of Service (DoS) via slow, exhaustive queries. Found in `BaseIngredientApi.ts`.
**Learning:** While parameterized queries prevent traditional SQL injection (command execution), they do not automatically escape SQL wildcards in pattern matching functions like `LIKE`/`ILIKE`.
**Prevention:** Always escape wildcard characters (`%`, `_`, `\`) using a sanitization function (e.g., `str.replace(/[%_\\]/g, "\\$&")`) before passing user-controlled strings to `.ilike()` or `.like()` in Supabase.
