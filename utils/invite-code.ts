import * as Crypto from "expo-crypto";

const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  return Crypto.randomUUID().replace(/-/g, "").substring(0, CODE_LENGTH).toUpperCase();
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
