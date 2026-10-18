jest.mock("expo/config-plugins", () => ({
  withXcodeProject: jest.fn((config) => config),
}));
jest.mock("expo-sharing/app.plugin", () => ({ default: jest.fn((config) => config) }));
const withSharing = require("expo-sharing/app.plugin").default;
const plugin = require("../withRecipeSharing");

it("forwards incoming-sharing configuration to the SDK 58 plugin", () => {
  const config = { ios: { supportsTablet: false } };
  const options = {
    ios: { enabled: true, appGroupId: "group.app.cookkit.cookkit" },
    android: { enabled: true, singleShareMimeTypes: ["text/plain"] },
  };
  expect(plugin(config, options)).toBe(config);
  expect(withSharing).toHaveBeenCalledWith(config, options);
});
