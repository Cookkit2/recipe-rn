import { arePaywallsEnabled } from "../paywall-flags";

describe("paywall environment flag", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [true, undefined, true],
    [true, "true", true],
    [true, "false", false],
    [true, "invalid", true],
    [false, undefined, true],
    [false, "true", true],
    [false, "false", true],
  ])("dev=%s, flag=%s enables paywalls=%s", (isDev, flag, expected) => {
    jest.replaceProperty(globalThis as typeof globalThis & { __DEV__: boolean }, "__DEV__", isDev);
    const env = { ...process.env };
    if (flag === undefined) delete env.EXPO_PUBLIC_ENABLE_PAYWALLS;
    else env.EXPO_PUBLIC_ENABLE_PAYWALLS = flag;
    jest.replaceProperty(process, "env", env);

    expect(arePaywallsEnabled()).toBe(expected);
  });
});
