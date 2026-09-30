## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-23 - Prevent PostgREST Wildcard Injection
**Vulnerability:** User input passed directly to `.ilike()` or `.like()` methods is vulnerable to wildcard injection.
**Learning:** PostgREST treats `*` as a wildcard alias, and `%` and `_` are standard SQL wildcards. Unsanitized input can allow attackers to perform wildcard injection and potentially extract information or cause denial of service.
**Prevention:** Always sanitize inputs by explicitly escaping `%`, `_`, `*`, and `\` using `str.replace(/[%_*\\]/g, "\\$&")` before passing them to `.ilike()` or `.like()`.
