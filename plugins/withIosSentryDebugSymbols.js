const { withXcodeProject } = require("expo/config-plugins");

const PHASE_NAME = "Upload Debug Symbols to Sentry";
const DSYM_INPUT =
  '"$(DWARF_DSYM_FOLDER_PATH)/$(DWARF_DSYM_FILE_NAME)/Contents/Resources/DWARF/$(PRODUCT_NAME)"';

module.exports = function withIosSentryDebugSymbols(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const phase = project.pbxItemByComment(PHASE_NAME, "PBXShellScriptBuildPhase");
    if (!phase) {
      throw new Error("Run withIosSentryDebugSymbols after the Sentry Expo plugin.");
    }

    // An explicit input creates an Xcode dependency on GenerateDSYMFile. Waiting
    // inside the shell script can time out while that task is still running.
    phase.inputPaths = [...new Set([...(phase.inputPaths ?? []), DSYM_INPUT])];
    phase.alwaysOutOfDate = 1;

    const bundleIdentifier = config.ios?.bundleIdentifier;
    for (const configuration of Object.values(project.pbxXCBuildConfigurationSection())) {
      const settings = configuration?.buildSettings;
      if (
        settings &&
        String(settings.PRODUCT_BUNDLE_IDENTIFIER).replaceAll('"', "") === bundleIdentifier
      ) {
        // Debug builds also need a producer for the declared input, even though
        // Sentry's script skips uploading symbols in Debug configurations.
        settings.DEBUG_INFORMATION_FORMAT = '"dwarf-with-dsym"';
      }
    }

    for (const target of Object.values(project.pbxNativeTargetSection())) {
      if (
        target?.productType &&
        String(target.productType).replaceAll('"', "") === "com.apple.product-type.application"
      ) {
        const sentryPhases = target.buildPhases.filter((entry) => entry.comment === PHASE_NAME);
        target.buildPhases = [
          ...target.buildPhases.filter((entry) => entry.comment !== PHASE_NAME),
          ...sentryPhases,
        ];
      }
    }

    return config;
  });
};
