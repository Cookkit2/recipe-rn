## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-28 - PostgREST ILIKE Wildcard Limitation
**Vulnerability:** Attempting to sanitize user inputs for PostgREST `.ilike()` functions by simply escaping `*` with a backslash does not work.
**Learning:** PostgREST actively rewrites `*` into `%` on the server before passing it to PostgreSQL, even if the `*` is escaped. This causes an exact-match search containing a literal `*` to instead evaluate as a literal `%`, creating functional bugs.
**Prevention:** To safely perform case-insensitive exact matching in Supabase/PostgREST on arbitrary strings, use `.regexIMatch()` combined with a regex escaping helper (e.g., `\\A${input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\Z`), rather than using `.ilike()`.
