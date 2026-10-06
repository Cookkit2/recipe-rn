## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2026-10-06 - Escaping Wildcard Character in Database Sanitization
**Vulnerability:** The sanitization helper function `sanitizeForDatabase` in `utils/input-sanitization.ts` escaped SQL wildcards (`%` and `_`) and backslashes but failed to escape the `*` character.
**Learning:** In Supabase/PostgREST applications, `*` is treated as a wildcard alias for `%`. When sanitizing inputs for `.ilike()` or `.like()` queries, `*` must be escaped alongside `%`, `_`, and `\` to prevent unauthorized wildcard expansion.
**Prevention:** Always escape `*` alongside `%`, `_`, and `\` (e.g., using `.replace(/[%_*\\]/g, "\\$&")`) when sanitizing user input for `LIKE`/`ILIKE` database queries.
