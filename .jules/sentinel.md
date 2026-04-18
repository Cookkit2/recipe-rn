## 2024-05-24 - Ineffective SQL Sanitization Anti-Pattern

**Vulnerability:** Insufficient Input Sanitization via Blacklisting

**Learning:** Blacklisting SQL keywords (like DROP, SELECT) and stripping quotes manually is an ineffective defense against SQL injection. Furthermore, it causes data corruption for legitimate user inputs (e.g. names like O'Connor or normal text containing the word "drop").

**Prevention:** Rely entirely on parameterized queries provided natively by the ORM or database layer (such as WatermelonDB/SQLite) for SQL injection protection. Do not strip SQL keywords or quotes in general-purpose sanitization utilities.
