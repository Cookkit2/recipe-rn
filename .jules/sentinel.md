## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-22 - [High] Fix PostgREST wildcard injection
**Vulnerability:** User input passed directly to `.ilike()` methods was vulnerable to wildcard injection because PostgREST explicitly supports `*` as an alias for `%`. This could lead to Denial of Service (DoS) and excessive load on the database via unbounded search.
**Learning:** PostgREST interprets `*` as a wildcard, which is not obvious if you only know standard SQL wildcards (`%`, `_`). This can be used to bypass sanitization if not explicitly handled.
**Prevention:** Always sanitize inputs passed to `.ilike()` or `.like()` methods by escaping `%`, `_`, `*`, and `\`.
