const fs = require("fs");
const file = "utils/__tests__/e2e-flags.test.ts";
let code = fs.readFileSync(file, "utf8");

const newTests = `
  it('should be false when Constants.expoConfig.extra.EXPO_PUBLIC_E2E is "false" (string)', async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: { EXPO_PUBLIC_E2E: "false" } },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it('should be false when process.env.EXPO_PUBLIC_E2E is "1"', async () => {
    process.env.EXPO_PUBLIC_E2E = "1";
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: {} },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });

  it('should be false when Constants.expoConfig.extra is undefined', async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: undefined },
    }));
    const { IS_E2E } = await import("../e2e-flags");
    expect(IS_E2E).toBe(false);
  });
});
`;

code = code.replace(/}\);\n$/, newTests);
fs.writeFileSync(file, code);
