import { generateInviteCode, isValidInviteCodeFormat } from "../invite-code";

describe("invite-code", () => {
  describe("generateInviteCode", () => {
    it("generates an 8-character alphanumeric code", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it("generates unique codes on successive calls", () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
      expect(codes.size).toBe(100);
    });
  });

  describe("isValidInviteCodeFormat", () => {
    it("accepts valid 8-char alphanumeric codes", () => {
      expect(isValidInviteCodeFormat("ABC12345")).toBe(true);
      expect(isValidInviteCodeFormat("A1B2C3D4")).toBe(true);
    });

    it("rejects codes that are too short or too long", () => {
      expect(isValidInviteCodeFormat("ABC1234")).toBe(false);
      expect(isValidInviteCodeFormat("ABC123456")).toBe(false);
    });

    it("rejects codes with lowercase or special chars", () => {
      expect(isValidInviteCodeFormat("abc12345")).toBe(false);
      expect(isValidInviteCodeFormat("AB-12345")).toBe(false);
    });
  });
});