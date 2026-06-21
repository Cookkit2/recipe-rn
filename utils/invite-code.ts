import * as Crypto from "expo-crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;
const MAX_VALID_BYTE = 252; // 256 - (256 % 36)

export function generateInviteCode(): string {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const randomBytes = Crypto.getRandomBytes(CODE_LENGTH);
    for (let i = 0; i < randomBytes.length; i++) {
      const byte = randomBytes[i]!;
      if (byte < MAX_VALID_BYTE) {
        code += CHARSET[byte % CHARSET.length];
        if (code.length === CODE_LENGTH) {
          return code;
        }
      }
    }
  }
  return code;
}

function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
