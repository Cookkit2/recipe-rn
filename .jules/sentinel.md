## 2025-02-18 - Prevent Wildcard Injection in Supabase

**Vulnerability:** User input passed to Supabase's `.ilike()` was vulnerable to wildcard injection because PostgreSQL wildcard characters (`%`, `_`) and PostgREST wildcards (`*`) were not escaped, allowing DoS or unexpected data matching.
**Learning:** `ilike` and `like` queries on Supabase/PostgREST need explicit sanitization of special characters (`%`, `_`, `*`, `?`, `\`) before the API call to treat user input as literals rather than patterns.
**Prevention:** Always use a sanitization helper function like `str.replace(/[%_*?\\]/g, "\\$&")` when passing dynamic user strings to `.like()` or `.ilike()`.
