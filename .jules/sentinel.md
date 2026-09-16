## 2024-05-20 - [Wildcard Injection in Supabase Queries]
**Vulnerability:** Unsanitized user input passed directly to `.ilike()` and `.like()` methods in Supabase/PostgREST queries.
**Learning:** PostgREST translates `.ilike()` and `.like()` to SQL `ILIKE` and `LIKE` operators, where `%`, `_`, and `*` act as wildcards. If a user inputs these characters, it can cause unintended matches or performance degradation (DoS via expensive wildcard queries).
**Prevention:** Always escape PostgreSQL wildcards (`%`, `_`), PostgREST wildcards (`*`), and backslashes (`\`) in user input before passing them to `.ilike()` or `.like()` methods using `str.replace(/[%_*\\]/g, "\\$&")`. Note that `?` should not be escaped as it causes an invalid escape sequence error in PostgreSQL.
