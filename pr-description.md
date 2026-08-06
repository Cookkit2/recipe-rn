🚨 Severity: HIGH
💡 Vulnerability: The `resetPassword` authentication endpoint lacked rate limiting, making it vulnerable to brute-force attacks and abuse (e.g. email bombing / spamming users).
🎯 Impact: Attackers could repeatedly trigger the password reset endpoint, spamming target emails or attempting to overwhelm the backend services, leading to potential denial-of-service or email quota exhaustion.
🔧 Fix: Added a rate limit check using the existing `authRateLimiter` at the beginning of the `resetPassword` method in `auth/SupabaseAuthStrategy.ts`, returning a `TOO_MANY_ATTEMPTS` error if the limit is exceeded (matching the pattern used in the sign in and sign up endpoints).
✅ Verification: Ran the full test suite and TypeScript checks successfully.
