const plugin = require("../withIosDisableUserScriptSandbox");
jest.mock("expo/config-plugins", () => ({ withXcodeProject: (config, action) => action(config) }));
jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
const fs = require("fs");
beforeEach(() => {
  jest.clearAllMocks();
  fs.existsSync.mockReturnValue(false);
});

it("keeps generated share targets iPhone-only and script sandboxing disabled", async () => {
  const buildSettings = { TARGETED_DEVICE_FAMILY: '"1,2"', ENABLE_USER_SCRIPT_SANDBOXING: "YES" };
  await plugin({
    ios: { supportsTablet: false },
    modResults: { pbxXCBuildConfigurationSection: () => ({ target: { buildSettings } }) },
    modRequest: { platformProjectRoot: "/tmp/test-ios" },
  });
  expect(buildSettings.TARGETED_DEVICE_FAMILY).toBe('"1"');
  expect(buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe("NO");
});
it("preserves device families when tablet support is enabled", async () => {
  const buildSettings = { TARGETED_DEVICE_FAMILY: '"1,2"' };
  await plugin({
    ios: { supportsTablet: true },
    modResults: { pbxXCBuildConfigurationSection: () => ({ target: { buildSettings } }) },
    modRequest: { platformProjectRoot: "/tmp/test-ios" },
  });
  expect(buildSettings.TARGETED_DEVICE_FAMILY).toBe('"1,2"');
});

it("raises quoted and integer Pod deployment targets while preserving newer targets", async () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(
    [
      "IPHONEOS_DEPLOYMENT_TARGET = 15;",
      'IPHONEOS_DEPLOYMENT_TARGET = "15.1";',
      "IPHONEOS_DEPLOYMENT_TARGET = '16';",
      "IPHONEOS_DEPLOYMENT_TARGET = 16.4;",
      'IPHONEOS_DEPLOYMENT_TARGET = "18.0";',
    ].join("\n")
  );
  await plugin({
    modResults: { pbxXCBuildConfigurationSection: () => ({}) },
    modRequest: { platformProjectRoot: "/tmp/test-ios" },
  });
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    "/tmp/test-ios/Pods/Pods.xcodeproj/project.pbxproj",
    [
      "IPHONEOS_DEPLOYMENT_TARGET = 16.4;",
      'IPHONEOS_DEPLOYMENT_TARGET = "16.4";',
      "IPHONEOS_DEPLOYMENT_TARGET = '16.4';",
      "IPHONEOS_DEPLOYMENT_TARGET = 16.4;",
      'IPHONEOS_DEPLOYMENT_TARGET = "18.0";',
    ].join("\n"),
    "utf8"
  );
});
