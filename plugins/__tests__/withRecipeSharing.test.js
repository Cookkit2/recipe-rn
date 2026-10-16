let mockDeduplicate;
jest.mock("expo/config-plugins", () => ({
  withEntitlementsPlist: (config, action) => {
    mockDeduplicate = action;
    return config;
  },
}));
jest.mock("expo-share-intent/app.plugin", () => ({ default: jest.fn((config) => config) }));
const plugin = require("../withRecipeSharing");

it("deduplicates the recipe app group on repeated prebuilds and preserves other groups", () => {
  plugin({}, {});
  const config = {
    modResults: {
      "com.apple.security.application-groups": ["group.cookkit", "group.other", "group.cookkit"],
    },
  };
  mockDeduplicate(config);
  mockDeduplicate(config);
  expect(config.modResults["com.apple.security.application-groups"]).toEqual([
    "group.cookkit",
    "group.other",
  ]);
});
