## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-28 - Wildcard Injection in Supabase ilike
**Vulnerability:** User input was passed directly to Supabase `.ilike()` and `.in()` (via a fallback synonym search). While `.in()` is safe, `.ilike()` allows Postgres wildcards `%`, `_`, `*`, `?`, `\` to be evaluated as patterns.
**Learning:** PostgREST evaluates `.ilike("column", userInput)` as a pattern match. If `userInput` is `"%something%"`, it becomes a slow, broad search. This is a common oversight when transitioning from ORMs that auto-escape LIKE patterns.
**Prevention:** Always sanitize user input intended for exact match before passing to `.ilike()` or `.like()` using a helper like `userInput.replace(/[%_*?\\]/g, "\\$&")`.
