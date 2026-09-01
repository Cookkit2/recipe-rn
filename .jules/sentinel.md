## 2024-05-24 - Wildcard Injection in Supabase/PostgREST
**Vulnerability:** User input passed directly to `.ilike()` was vulnerable to wildcard injection.
**Learning:** PostgREST (used by Supabase) natively maps the asterisk (`*`) character to the `%` wildcard for LIKE/ILIKE operations.
**Prevention:** When escaping user input for `.ilike()`, ensure that `*` is escaped alongside `%`, `_`, and `\`. E.g., `str.replace(/[%_*\\]/g, "\\$&")`.
