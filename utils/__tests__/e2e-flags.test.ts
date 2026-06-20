import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

describe("IS_E2E", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_E2E;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be true when process.env.EXPO_PUBLIC_E2E is "true"', async () => {
    process.env.EXPO_PUBLIC_E2E = "true";
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: {} },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(true);
  });

  it("should be true when Constants.expoConfig.extra.EXPO_PUBLIC_E2E is true (boolean)", async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: { EXPO_PUBLIC_E2E: true } },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(true);
  });

  it('should be true when Constants.expoConfig.extra.EXPO_PUBLIC_E2E is "true" (string)', async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: { EXPO_PUBLIC_E2E: "true" } },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(true);
  });

  it("should be false when neither process.env nor Constants are set", async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: {} },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it('should be false when process.env.EXPO_PUBLIC_E2E is "false" and Constants is undefined', async () => {
    process.env.EXPO_PUBLIC_E2E = "false";
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: undefined },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it("should be false when Constants.expoConfig.extra.EXPO_PUBLIC_E2E is false (boolean)", async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: { EXPO_PUBLIC_E2E: false } },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it("should be false when Constants.expoConfig is undefined", async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: undefined,
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it("should be false when Constants is empty", async () => {
    jest.doMock("expo-constants", () => ({}));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });
});
