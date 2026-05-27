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

## 2024-05-03 - Prevent SSRF and Parameter Injection in API Calls

**Vulnerability:** Constructing URLs via template literals without encoding parameters (e.g. `` url = `${BASE_URL}?id=${videoId}&key=${API_KEY}` ``) allows an attacker to inject arbitrary query parameters (like `123&key=fake`), bypassing intended API keys or causing SSRF/parameter pollution.

**Learning:** Raw string interpolation for URL components leaves APIs open to manipulation, even for seemingly simple identifiers.

**Prevention:** When constructing URLs for external API requests (e.g., using `fetch`), always sanitize interpolated variables (like `videoId`) using `encodeURIComponent()` to prevent Server-Side Request Forgery (SSRF) and parameter injection vulnerabilities.

## 2024-05-25 - Bun Lockfile Audit Issues

**Learning:** Modifying the `bun.lockb` file (e.g. `bun update`) in an effort to resolve a vulnerability that breaks the GitHub Actions pipeline causes subsequent build caching and `npm audit`/`bun audit` tools to fail.

**Prevention:** If `bun.lockb` is required for caching or the pipeline expects `fast-uri` issue to be solved through `bun` commands, ensure that modifying `package.json` directly avoids breaking the `lockb` file. In this case, running `bun add fast-uri@3.1.2` fixes the issue locally, but you must be careful to commit both `package.json` and `bun.lockb`.

## 2025-05-19 - Hardcoded Email Address

**Vulnerability:** Hardcoded developer email addresses in source code.

**Learning:** Hardcoded emails in frontend code (like React Native apps) can be easily extracted by reverse-engineering the compiled bundle or by scraping source repositories. This exposes developers to spam, phishing, and potential social engineering attacks, while also coupling application logic to a specific individual.

**Prevention:** Always extract support or contact email addresses into environment variables or server-fetched configurations. Use generic aliases (e.g., support@domain.com) instead of personal developer emails. Ensure fallback logic uses non-personal generic addresses if the environment variable is missing.

## 2024-05-27 - Supabase `.or()` String Concatenation Injection Risk

**Vulnerability:** Constructing string queries for Supabase's `.or()` method using `join(",")` (e.g., `synonym.ilike."${n}"`) creates an injection risk in PostgREST, especially if manual escaping is bypassed or flawed.

**Learning:** PostgREST `.or()` parameters require stringent syntax that is difficult to safely escape manually. Since `.in()` does not support case-insensitive matching (`ilike`), developers often fall back to building raw OR strings, increasing attack surfaces.

**Prevention:** To perform case-insensitive multiple-value queries safely, avoid string concatenation entirely. Instead, use an array of individual parameterized `.ilike()` queries executed concurrently using `Promise.all()`.
