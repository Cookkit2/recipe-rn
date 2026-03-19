## 2024-03-20 - Redacting API Keys in API Error Responses

**Vulnerability:** API requests made with external services (like Google Gemini) can sometimes fail with detailed error responses that inadvertently reflect back the configured API keys or other sensitive credentials in the raw response body. Logging these raw responses as text directly exposes secrets to error tracking services like Sentry.
**Learning:** External API error responses (`response.text()`) should never be blindly logged, especially if the API key is passed in a header, URL, or payload that might be echoed in the error.
**Prevention:** Always sanitize or redact sensitive credentials such as `API_KEY` from third-party error messages using `.replace()` before passing the error strings into application loggers.
