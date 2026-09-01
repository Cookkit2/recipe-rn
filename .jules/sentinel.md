## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-23 - Prevent Supabase ilike Wildcard Injection
**Vulnerability:** Exact text queries using `.ilike()` passed unescaped user input (like `%` or `_`), potentially causing wildcard injection which leads to unexpected multiple row matches or slow unindexed queries.
**Learning:** PostgREST's `.ilike` method processes `%` and `_` as wildcard operators by default. While parameterized so it's not a full SQL injection, it acts as a pattern matching injection.
**Prevention:** Sanitize user input bound for `.ilike` queries by escaping `%`, `_`, `*`, `?`, and `\` with a leading backslash (e.g., `input.replace(/[%_*?\\]/g, "\\$&")`).
