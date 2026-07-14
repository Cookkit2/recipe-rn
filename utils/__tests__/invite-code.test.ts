import { generateInviteCode, isValidInviteCodeFormat } from "../invite-code";
import * as Crypto from "expo-crypto";

jest.mock("expo-crypto", () => {
  const actual = jest.requireActual("expo-crypto");
  return {
    ...actual,
    getRandomBytes: jest.fn(actual.getRandomBytes),
  };
});

describe("generateInviteCode", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should generate an 8-character string", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it("should generate a string containing only uppercase letters and numbers", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("should generate unique codes", () => {
    const code1 = generateInviteCode();
    const code2 = generateInviteCode();
    expect(code1).not.toBe(code2);
  });

  it("should handle bytes greater than or equal to MAX_VALID_BYTE (252) and retry", () => {
    let callCount = 0;
    (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
      callCount++;
      // First 3 calls return all invalid bytes (>= 252)
      if (callCount <= 3) {
        return new Uint8Array([255, 254, 253, 252, 255, 254, 253, 252]);
      }
      // 4th call returns valid bytes
      return new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    const code = generateInviteCode();

    // It should have asked for random bytes 4 times total
    expect(Crypto.getRandomBytes).toHaveBeenCalledTimes(4);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("should only request missing bytes if partially fulfilled", () => {
    let callCount = 0;
    (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
      callCount++;
      // First call returns 4 invalid, 4 valid
      if (callCount === 1) {
        return new Uint8Array([255, 254, 253, 252, 0, 1, 2, 3]);
      }
      // Second call returns all valid
      return new Uint8Array([4, 5, 6, 7, 8, 9, 10, 11]);
    });

    const code = generateInviteCode();

    expect(Crypto.getRandomBytes).toHaveBeenCalledTimes(2);
    expect(code).toHaveLength(8);
  });
});

describe("isValidInviteCodeFormat", () => {
  it("should return true for valid formats", () => {
    expect(isValidInviteCodeFormat("ABCDEF12")).toBe(true);
    expect(isValidInviteCodeFormat("12345678")).toBe(true);
    expect(isValidInviteCodeFormat("ZZZZZZZZ")).toBe(true);
  });

  it("should return false for lowercase letters", () => {
    expect(isValidInviteCodeFormat("abcdef12")).toBe(false);
    expect(isValidInviteCodeFormat("ABCdef12")).toBe(false);
  });

  it("should return false for invalid lengths", () => {
    expect(isValidInviteCodeFormat("ABCDEF1")).toBe(false); // 7 chars
    expect(isValidInviteCodeFormat("ABCDEF123")).toBe(false); // 9 chars
    expect(isValidInviteCodeFormat("")).toBe(false); // empty
  });

  it("should return false for special characters", () => {
    expect(isValidInviteCodeFormat("ABCD-123")).toBe(false);
    expect(isValidInviteCodeFormat("ABCD_123")).toBe(false);
    expect(isValidInviteCodeFormat("ABCD!123")).toBe(false);
  });
});
