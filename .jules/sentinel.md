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

## 2025-03-08 - [Insecure Randomness for Invite Code Generation]
**Vulnerability:** Found `Math.random()` being used to select characters from a predefined charset to generate invite codes.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could allow attackers to guess or predict invite codes and potentially bypass access controls.
**Prevention:** Always use a cryptographically secure pseudo-random number generator (CSPRNG) like `expo-crypto`'s `getRandomBytes` when generating security-sensitive random values like invite codes, tokens, or passwords. Ensure you also handle modulo bias when mapping random bytes to a character set.
## 2026-06-09 - Prevent URL Parameter Injection with API Keys
**Vulnerability:** Interpolating unencoded environment variables like `API_KEY` directly into URL strings (e.g., `const url = \`${BASE_URL}?key=${API_KEY}\`;`) could lead to parameter injection or malformed requests if the variable contains unexpected characters (like `&` or `=`).
**Learning:** While API keys are generally assumed to be URL-safe alphanumeric strings, defensively encoding them guarantees structural integrity and prevents theoretical SSRF or query pollution vectors.
**Prevention:** When constructing URL query strings via template literals, always defensively encode all interpolated variables—including environment-loaded API keys and standard identifiers—using `encodeURIComponent()`.
## 2026-06-13 - Removed Gemini API String Replacement Redaction
**Vulnerability:** The Gemini API Key could be leaked in error logs due to incomplete or error-prone string replacement on raw error text.
**Learning:** Using string `replaceAll` for redaction on raw network payloads is unsafe. If the API returns the key in a different format (e.g., URL-encoded, or if the API key happens to be a substring of a larger logged variable), the replacement fails.
**Prevention:** Prevent secrets from entering the error context entirely by parsing safe metadata (like `response.status`) and never logging raw, untrusted response payloads (`response.text()`).
## 2024-06-14 - Fix exposed sensitive data in local logs
**Vulnerability:** The application was using a dual-logger architecture (`react-native-logs` and `Sentry`). While data sent to Sentry was properly sanitized, data logged locally via `react-native-logs` bypassed the `filterSensitiveData` function, exposing secrets (like access tokens, API keys, passwords) directly in local development consoles and device logs.
**Learning:** Security sanitization must be applied upstream of ALL egress paths. It's a common oversight to assume local logs are "safe" and only sanitize remote logs. However, local logs can be extracted from devices or inadvertently leaked.
**Prevention:** Always apply the security data filter to the arguments *before* dispatching them to any logger implementation, regardless of whether it's local or remote.
