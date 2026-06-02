import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const randomByte = Crypto.getRandomBytes(1)[0]!;
    // Discard values >= 252 to avoid modulo bias since 256 % 36 = 4 and 256 - 4 = 252
    if (randomByte < 252) {
      code += CHARSET[randomByte % CHARSET.length];
    }
  }
  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
