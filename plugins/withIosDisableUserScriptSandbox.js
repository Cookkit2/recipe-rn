const { withXcodeProject } = require("expo/config-plugins");

/**
 * RN/Expo bundling + Sentry need broad filesystem access during build phases.
 * expo-build-properties (SDK 55) does not expose this Xcode flag.
 */
function withIosDisableUserScriptSandbox(config) {
  return withXcodeProject(config, (config) => {
    const section = config.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(section)) {
      const entry = section[key];
      if (entry && typeof entry === "object" && entry.buildSettings) {
        entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
      }
    }
    return config;
  });
}

module.exports = withIosDisableUserScriptSandbox;
