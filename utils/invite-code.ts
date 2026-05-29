import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  const randomBytes = Crypto.getRandomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[randomBytes[i]! % CHARSET.length];
  }
  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
