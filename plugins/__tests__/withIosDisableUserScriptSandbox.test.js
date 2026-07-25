const withIosDisableUserScriptSandbox = require("../withIosDisableUserScriptSandbox");

jest.mock("expo/config-plugins", () => ({
  withXcodeProject: jest.fn((config, action) => action(config)),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
}));

describe("withIosDisableUserScriptSandbox", () => {
  it("should set ENABLE_USER_SCRIPT_SANDBOXING to NO and bump IPHONEOS_DEPLOYMENT_TARGET for main app target", async () => {
    const mockBuildConfigs = {
      1: {
        buildSettings: {
          ENABLE_USER_SCRIPT_SANDBOXING: "YES",
          IPHONEOS_DEPLOYMENT_TARGET: '"15.1"',
        },
      },
      2: {
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: "15.1",
        },
      },
      3: {
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: '"17.0"',
        },
      },
      4: {
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: "'15.1'",
        },
      },
    };

    const mockConfig = {
      modResults: {
        pbxXCBuildConfigurationSection: () => mockBuildConfigs,
      },
      modRequest: {
        platformProjectRoot: "/tmp",
      },
    };

    await withIosDisableUserScriptSandbox(mockConfig);

    expect(mockBuildConfigs["1"].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe("NO");
    expect(mockBuildConfigs["1"].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('"16.4"');

    expect(mockBuildConfigs["2"].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe("NO");
    expect(mockBuildConfigs["2"].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("16.4");

    expect(mockBuildConfigs["3"].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe("NO");
    expect(mockBuildConfigs["3"].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('"17.0"');

    expect(mockBuildConfigs["4"].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe("NO");
    expect(mockBuildConfigs["4"].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("'16.4'");
  });
});
