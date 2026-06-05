import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  // 256 is not perfectly divisible by 36 (CHARSET.length)
  // To avoid modulo bias, we reject bytes >= 252 (36 * 7)
  const maxValidByte = 252;

  while (code.length < CODE_LENGTH) {
    const randomBytes = Crypto.getRandomBytes(CODE_LENGTH);
    for (let i = 0; i < randomBytes.length && code.length < CODE_LENGTH; i++) {
      const byte = randomBytes[i]!;
      if (byte < maxValidByte) {
        code += CHARSET[byte % CHARSET.length];
      }
    }
  }

  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
