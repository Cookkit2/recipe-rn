## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-09-26 - Fix wildcard injection in ilike queries
**Vulnerability:** In Supabase/PostgREST queries, passing unsanitized user input directly to `.ilike()` or `.like()` allows wildcard injection. Attackers could insert `%`, `_`, or `*` to alter query behavior, potentially leading to slow queries (DoS) or unauthorized data access.
**Learning:** `*` is treated as a wildcard by PostgREST and must be escaped, unlike standard PostgreSQL where only `%` and `_` are wildcards. Also, `?` is not a wildcard and escaping it will break legitimate exact matches.
**Prevention:** Always sanitize inputs to `.ilike()` and `.like()` by verifying the type and using `str.replace(/[%_*\\]/g, "\\$&")`.
## 2026-09-26 - Dependency Audit Issues
**Vulnerability:** A CI failure occurred on a `Dependency Audit` check because `bun audit --audit-level=high` returned 49 high vulnerabilities for `xmldom`, `brace-expansion`, `browserslist`, `fast-uri`, `image-size`, `js-yaml`, `nanoid`, `postcss`, `sharp`, and `shell-quote`.
**Learning:** These dependencies are deeply nested inside toolchain packages like `expo`, `expo-cli`, `@babel/core`, and `jest` which are often difficult to fix without breaking other internal toolings.
**Prevention:** Treat these toolchain dependency issues as out-of-scope for the particular code fix (e.g. wildcard injection in ilike queries). They should be fixed by upgrading the overarching dependencies or waiting for upstream fixes. Do not mask these errors by modifying the workflow files.
