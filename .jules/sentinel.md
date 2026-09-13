## 2024-10-24 - Supabase `.ilike` Wildcard Injection
**Vulnerability:** User input passed directly to Supabase `.ilike()` was vulnerable to wildcard injection (`%`, `_`, etc.).
**Learning:** PostgREST translates `.ilike()` to SQL `ILIKE`, which interprets `%` and `_` as wildcard characters. If user input isn't sanitized, attackers can bypass exact-match constraints.
**Prevention:** Always sanitize user input meant for literal matching in `.ilike()` or `.like()` by escaping wildcards using `.replace(/[%_*?\\]/g, "\\$&")`.
