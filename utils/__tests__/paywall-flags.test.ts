import { arePaywallsEnabled } from "../paywall-flags";

describe("paywalls paused for all builds", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [true, undefined, false],
    [true, "true", false],
    [true, "false", false],
    [true, "invalid", false],
    [false, undefined, false],
    [false, "true", false],
    [false, "false", false],
  ])("dev=%s, flag=%s enables paywalls=%s", (isDev, flag, expected) => {
    jest.replaceProperty(globalThis as typeof globalThis & { __DEV__: boolean }, "__DEV__", isDev);
    const env = { ...process.env };
    if (flag === undefined) delete env.EXPO_PUBLIC_ENABLE_PAYWALLS;
    else env.EXPO_PUBLIC_ENABLE_PAYWALLS = flag;
    jest.replaceProperty(process, "env", env);

    expect(arePaywallsEnabled()).toBe(expected);
  });
});
