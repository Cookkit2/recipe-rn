import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  const maxValidByte = 256 - (256 % CHARSET.length); // 252 for length 36

  while (code.length < CODE_LENGTH) {
    const randomBytes = Crypto.getRandomBytes(1);
    const byteValue = randomBytes[0]!;

    // Rejection sampling to prevent modulo bias
    if (byteValue < maxValidByte) {
      code += CHARSET[byteValue % CHARSET.length];
    }
  }
  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
