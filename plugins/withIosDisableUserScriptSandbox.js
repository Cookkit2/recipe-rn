/**
 * Expo config plugin to:
 * 1. Disable Xcode's ENABLE_USER_SCRIPT_SANDBOXING
 * 2. Fix iOS deployment target mismatches in Pods project (bump <16.4 → 16.4)
 *
 * Required because some pods (react-native-image-colors) target iOS 15.1
 * but ExpoModulesCore requires 16.4+, causing Swift module import failures.
 */
const { withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withIosDisableUserScriptSandbox(config) {
  return withXcodeProject(config, async (config) => {
    // Fix main app target
    const xcodeProject = config.modResults;
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in buildConfigs) {
      const buildConfig = buildConfigs[key];
      if (buildConfig && buildConfig.buildSettings) {
        buildConfig.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";

        const target = buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
        if (target) {
          const version = parseFloat(target.replace(/["']/g, ""));
          if (version < 16.4) {
            buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = target.startsWith('"')
              ? '"16.4"'
              : target.startsWith("'")
                ? "'16.4'"
                : "16.4";
          }
        }
      }
    }

    // Fix Pods project deployment targets
    const podsProjectPath = path.join(
      config.modRequest.platformProjectRoot,
      "Pods",
      "Pods.xcodeproj",
      "project.pbxproj"
    );

    if (fs.existsSync(podsProjectPath)) {
      let pbxproj = fs.readFileSync(podsProjectPath, "utf8");
      // Replace all deployment targets below 16.4 with 16.4
      // Match patterns like: IPHONEOS_DEPLOYMENT_TARGET = 15.1;
      const replaced = pbxproj.replace(
        /IPHONEOS_DEPLOYMENT_TARGET = (\d+\.\d+);/g,
        (match, version) => {
          if (parseFloat(version) < 16.4) {
            return "IPHONEOS_DEPLOYMENT_TARGET = 16.4;";
          }
          return match;
        }
      );
      if (replaced !== pbxproj) {
        fs.writeFileSync(podsProjectPath, replaced, "utf8");
        console.log("[withIosDisableUserScriptSandbox] Fixed deployment targets in Pods project");
      }
    }

    return config;
  });
}

module.exports = withIosDisableUserScriptSandbox;
