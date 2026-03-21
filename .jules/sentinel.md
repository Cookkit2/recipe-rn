## 2024-05-20 - [Fix SQL Injection Risk in RecipeRepository]

**Vulnerability:** Used WatermelonDB's built-in `Q.sanitizeLikeString(tag)` which may not sufficiently cover the application's comprehensive threat model compared to the project's centralized sanitization utilities.
**Learning:** Always prefer the project's bespoke input sanitization functions (like `sanitizeSearchTerm` or `sanitizeForDatabase` from `~/utils/input-sanitization`) over generic library-provided sanitization to ensure consistent defense-in-depth across the application.
**Prevention:** Audit all uses of `Q.like` or direct string interpolations in database queries to ensure they pass through `sanitizeSearchTerm` or similar project-specific validation/sanitization functions before execution.

## 2024-03-20 - Redacting API Keys in API Error Responses

**Vulnerability:** API requests made with external services (like Google Gemini) can sometimes fail with detailed error responses that inadvertently reflect back the configured API keys or other sensitive credentials in the raw response body. Logging these raw responses as text directly exposes secrets to error tracking services like Sentry.
**Learning:** External API error responses (`response.text()`) should never be blindly logged, especially if the API key is passed in a header, URL, or payload that might be echoed in the error.
**Prevention:** Always sanitize or redact sensitive credentials such as `API_KEY` from third-party error messages using `.replace()` before passing the error strings into application loggers.
