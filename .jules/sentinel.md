## 2024-05-24 - Ineffective SQL Sanitization Anti-Pattern

**Vulnerability:** Insufficient Input Sanitization via Blacklisting

**Learning:** Blacklisting SQL keywords (like DROP, SELECT) and stripping quotes manually is an ineffective defense against SQL injection. Furthermore, it causes data corruption for legitimate user inputs (e.g. names like O'Connor or normal text containing the word "drop").

**Prevention:** Rely entirely on parameterized queries provided natively by the ORM or database layer (such as WatermelonDB/SQLite) for SQL injection protection. Do not strip SQL keywords or quotes in general-purpose sanitization utilities.

## 2024-04-06 - [Email Validation Added to Auth Screens]
**Vulnerability:** Missing input validation on client-side registration and login forms allowed arbitrary strings (including non-email formats) to be submitted to the backend as emails.
**Learning:** React Native form state must implement input constraints (like basic regex validation) before calling the backend auth store.
**Prevention:** Always implement basic regex validation on login/registration screens to fail fast and securely before executing API requests or dispatching to Zustand stores.

## 2025-02-24 - Avoid SQLite Position Parameter Misalignment
**Vulnerability:** Relying on positional array parameters `?` in SQLite (especially via `expo-sqlite`) can lead to SQL injection vulnerabilities due to parameter misalignment, object-to-string coercion bugs, or parameter pollution. This is frequently flagged by code analysis tools.
**Learning:** `expo-sqlite` and similar SQL libraries allow dynamic mapping, meaning using `?` binds parameters structurally by an index array.
**Prevention:** Always use explicitly mapped named parameters like `$columnName` when using `runAsync` and `getFirstAsync` in `expo-sqlite` and pass the parameters as an object instead of an array.

## 2025-02-28 - Removed Vulnerable forceSignOut Method
**Vulnerability:** The `forceSignOut` method in `AuthStore` bypassed the remote authentication strategy entirely and only cleared the local session state. This left the user's remote session and tokens valid, allowing a potential attacker who captured the tokens to continue making authorized requests even after the user believed they were securely logged out.
**Learning:** Bypassing remote sign-out strategies for the sake of "forcing" a local sign-out can lead to orphaned, active backend sessions. Fallback mechanisms should always attempt remote invalidation first.
**Prevention:** Rely on standard logout methods (e.g., `signOut`) that attempt a remote sign-out (e.g., `strategy.signOut()`) before clearing local state, and avoid introducing local-only state clearing bypasses.
