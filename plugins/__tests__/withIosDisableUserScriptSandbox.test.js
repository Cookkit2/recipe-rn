const plugin = require("../withIosDisableUserScriptSandbox");
jest.mock("expo/config-plugins", () => ({ withXcodeProject: (config, action) => action(config) }));
jest.mock("fs", () => ({ existsSync: () => false }));

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
