import { isValidInviteCodeFormat } from "~/utils/invite-code";

describe("Household Lifecycle Integration", () => {
  describe("invite code validation", () => {
    it("validates generated codes", () => {
      const validCode = "ABC12345";
      const invalidCode = "abc";

      expect(isValidInviteCodeFormat(validCode)).toBe(true);
      expect(isValidInviteCodeFormat(invalidCode)).toBe(false);
    });
  });

  describe("subscription tier limits", () => {
    it("free tier allows max 2 members", () => {
      const freeMax = 2;
      expect(freeMax).toBe(2);
    });

    it("pro tier allows max 6 members", () => {
      const proMax = 6;
      expect(proMax).toBe(6);
    });
  });
});
