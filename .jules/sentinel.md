## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2024-05-18 - Fix wildcard injection in BaseIngredientApi
**Vulnerability:** User input was passed directly to Supabase `.ilike()` query without escaping special wildcard characters (`%`, `_`, `\`).
**Learning:** PostgreSQL `ILIKE` and `LIKE` queries evaluate `%` and `_` as wildcards. If user input contains these characters, it can alter the intended search pattern, potentially leading to slow queries (ReDoS equivalent for DBs) or unauthorized data enumeration.
**Prevention:** Always sanitize input passed to `ilike` or `like` methods by escaping wildcard characters (e.g., `input.replace(/[%_\\]/g, "\\$&")`) before performing the query.
