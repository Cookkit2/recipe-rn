## 2024-05-24 - Wildcard Injection in Supabase ilike
**Vulnerability:** Supabase `.ilike()` and `.like()` queries are vulnerable to wildcard injection (%, _, *, ?, \) if user input is passed directly without sanitization, leading to logic bypass and potential ReDoS.
**Learning:** Developers often forget that `.ilike()` interprets these special characters as wildcards, not literal strings, even when aiming for exact, case-insensitive matching.
**Prevention:** Always extract user input going into `.ilike()` into a sanitized variable by escaping special characters using a pattern like `term.replace(/[%_*\\?]/g, "\\$&")`.
