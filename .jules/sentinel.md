## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2025-02-27 - Resolve high severity dependency vulnerabilities
**Learning:** CI pipelines running `bun audit --audit-level=high` will fail if deep dependencies contain high severity vulnerabilities.
**Action:** Use the `resolutions` field in `package.json` to force the package manager to use non-vulnerable versions of the affected transitive dependencies, and run `bun install` to update the lockfile.
