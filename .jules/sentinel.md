## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.

## 2025-02-27 - Supabase Wildcard Injection in ilike Queries
**Vulnerability:** Unsanitized user input passed directly to Supabase `.ilike()` and `.like()` methods allows for wildcard injection (`%`, `_`, `*`, `?`, `\`), leading to unauthorized pattern matching or slow query DoS attacks.
**Learning:** While SQL injection is handled natively by WatermelonDB / SQLite / Supabase parameterized queries, wildcard injection is not automatically escaped for `ilike` and `like` query operators.
**Prevention:** Always sanitize user inputs passed into `.ilike()` or `.like()` methods using an escaping function (e.g., `str.replace(/[%_*?\\]/g, "\\$&")`) before constructing the query.

## 2025-02-27 - PostgreSQL ILIKE Escaping Error
**Vulnerability:** When escaping user inputs for PostgreSQL `LIKE`/`ILIKE` queries, escaping non-wildcard characters (like `?` or `*`) causes the database to throw an `invalid escape sequence` error, breaking the query.
**Learning:** PostgreSQL only allows escaping of its actual wildcard characters (`%` and `_`) and the escape character itself (usually `\`). It does not silently ignore invalid escape sequences.
**Prevention:** Only escape `%`, `_`, and `\` when sanitizing inputs for PostgreSQL pattern matching. Use `str.replace(/[%_\\]/g, "\\$&")`.
