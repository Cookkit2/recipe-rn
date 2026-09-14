## 2025-02-14 - Prevent Supabase ilike Wildcard Injection
**Vulnerability:** User string input was passed directly into `.ilike("field", name)` in `BaseIngredientApi`.
**Learning:** In PostgREST/Supabase, `ilike` treats `%`, `_`, and `\` as wildcards. Unsanitized input allows wildcard injection, bypassing expected query filters or potentially causing a slow regex DoS due to expensive full-table matching.
**Prevention:** Always escape these specific characters in user input using `.replace(/[%_\\]/g, "\\$&")` before passing them into `.like()` or `.ilike()` filters, while leaving legitimate SQL operations parameterized.
