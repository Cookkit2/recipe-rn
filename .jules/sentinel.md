## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2024-05-03 - [High] Fix PostgREST wildcard injection
**Vulnerability:** User input passed directly to `.ilike()` methods was vulnerable to wildcard injection because PostgREST explicitly supports `*` as an alias for `%`. This could lead to Denial of Service (DoS) and excessive load on the database via unbounded search.
**Learning:** PostgREST interprets `*` as a wildcard, which is not obvious if you only know standard SQL wildcards (`%`, `_`). This can be used to bypass sanitization if not explicitly handled.
**Prevention:** Always sanitize inputs passed to `.ilike()` or `.like()` methods by escaping `%`, `_`, `*`, and `\`.
## 2024-05-03 - [High] Double escaping PostgREST wildcards
**Learning:** If a string is sanitized through a central `sanitizeForDatabase` utility that escapes standard SQL wildcards (`%`, `_`, `\`), do not wrap it again in a custom `escapePostgrestWildcards` function. Doing so escapes the backslashes twice, causing functional regressions (e.g., breaking lookups for strings like '2% milk' because the database searches for the literal string '2\% milk').
**Action:** When adding wildcard sanitization, trace the variables (like `missingNames`) back to their source to check if they have already been mapped through an existing sanitization utility. Ensure the `*` escape is added to the centralized utility instead of layering multiple escape functions.
