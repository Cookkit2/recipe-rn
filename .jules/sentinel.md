## 2024-04-06 - [Email Validation Added to Auth Screens]
**Vulnerability:** Missing input validation on client-side registration and login forms allowed arbitrary strings (including non-email formats) to be submitted to the backend as emails.
**Learning:** React Native form state must implement input constraints (like basic regex validation) before calling the backend auth store.
**Prevention:** Always implement basic regex validation on login/registration screens to fail fast and securely before executing API requests or dispatching to Zustand stores.

## 2025-02-24 - Avoid SQLite Position Parameter Misalignment
**Vulnerability:** Relying on positional array parameters `?` in SQLite (especially via `expo-sqlite`) can lead to SQL injection vulnerabilities due to parameter misalignment, object-to-string coercion bugs, or parameter pollution. This is frequently flagged by code analysis tools.
**Learning:** `expo-sqlite` and similar SQL libraries allow dynamic mapping, meaning using `?` binds parameters structurally by an index array.
**Prevention:** Always use explicitly mapped named parameters like `$columnName` when using `runAsync` and `getFirstAsync` in `expo-sqlite` and pass the parameters as an object instead of an array.
