## 2025-02-23 - Prevent Supabase ilike Wildcard Injection
**Vulnerability:** Exact text queries using `.ilike()` passed unescaped user input (like `%` or `_`), potentially causing wildcard injection which leads to unexpected multiple row matches or slow unindexed queries.
**Learning:** PostgREST's `.ilike` method processes `%` and `_` as wildcard operators by default. While parameterized so it's not a full SQL injection, it acts as a pattern matching injection.
**Prevention:** Sanitize user input bound for `.ilike` queries by escaping `%`, `_`, `*`, `?`, and `\` with a leading backslash (e.g., `input.replace(/[%_*?\\]/g, "\\$&")`).
