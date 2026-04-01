## 2024-05-30 - Insecure Hash Implementation

**Vulnerability:** The application was using a simplistic string concatenation `hash_${token}` to "hash" refresh tokens before persisting them in the database. This provided zero cryptographic security, exposing the raw tokens in the event of a database compromise.
**Learning:** For sensitive data like refresh tokens, use a strong cryptographic hashing algorithm such as SHA-256 before storage.
**Prevention:** Use a dedicated crypto library (like `expo-crypto`) and its digest functions (e.g., `Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token)`) instead of rolling custom weak obfuscation. Always treat token hashing as an asynchronous operation to ensure non-blocking security measures.
