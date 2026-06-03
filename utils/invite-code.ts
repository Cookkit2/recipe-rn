import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  // The CHARSET has 36 characters.
  // 256 % 36 = 4. To avoid modulo bias, we use rejection sampling
  // and discard any random byte >= 252 (since 252 = 7 * 36).
  const maxValidByte = 252;

  while (code.length < CODE_LENGTH) {
    const randomBytes = Crypto.getRandomBytes(1);
    const byte = randomBytes[0]!;

    if (byte < maxValidByte) {
      code += CHARSET[byte % CHARSET.length];
    }
  }

  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
