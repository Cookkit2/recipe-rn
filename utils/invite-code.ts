import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

// Number of characters in the charset (36)
const CHARSET_LENGTH = CHARSET.length;
// The largest multiple of 36 that is <= 256 is 252 (36 * 7)
// We discard bytes >= 252 to ensure uniform distribution (prevent modulo bias)
const MAX_VALID_BYTE = 252;

export function generateInviteCode(): string {
  let code = "";

  while (code.length < CODE_LENGTH) {
    // Generate a batch of random bytes
    const randomBytes = Crypto.getRandomBytes(CODE_LENGTH);

    for (let i = 0; i < randomBytes.length && code.length < CODE_LENGTH; i++) {
      const byte = randomBytes[i]!;

      // Rejection sampling to prevent modulo bias
      if (byte < MAX_VALID_BYTE) {
        code += CHARSET[byte % CHARSET_LENGTH];
      }
    }
  }

  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
