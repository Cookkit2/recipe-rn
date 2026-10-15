const { withEntitlementsPlist } = require("expo/config-plugins");
const withShareIntent = require("expo-share-intent/app.plugin").default;

module.exports = function withRecipeSharing(config, options) {
  // Mods run in reverse registration order. Deduplicate after the share plugin
  // appends its group, so repeated prebuilds preserve a single entitlement.
  config = withEntitlementsPlist(config, (config) => {
    const groups = config.modResults["com.apple.security.application-groups"];
    if (Array.isArray(groups))
      config.modResults["com.apple.security.application-groups"] = [...new Set(groups)];
    return config;
  });
  return withShareIntent(config, options);
};
