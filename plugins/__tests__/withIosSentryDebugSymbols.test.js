const path = require("path");
const xcode = require("xcode");

jest.mock("expo/config-plugins", () => ({
  withXcodeProject: (config, action) => action(config),
}));

const phaseName = "Upload Debug Symbols to Sentry";
const symbolInput =
  '"$(DWARF_DSYM_FOLDER_PATH)/$(DWARF_DSYM_FILE_NAME)/Contents/Resources/DWARF/$(PRODUCT_NAME)"';

function readProject() {
  const project = xcode.project(
    path.resolve(__dirname, "../../ios/Cookkit.xcodeproj/project.pbxproj")
  );
  project.parseSync();
  return project;
}

function appBuildSettings(project) {
  return Object.values(project.pbxXCBuildConfigurationSection())
    .filter((entry) => entry?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER === "app.cookkit.cookkit")
    .map((entry) => entry.buildSettings);
}

it("checked-in native project waits for the app dSYM before uploading symbols", () => {
  const project = readProject();
  const phase = project.pbxItemByComment(phaseName, "PBXShellScriptBuildPhase");
  expect(phase.inputPaths).toContain(symbolInput);
  expect(phase.alwaysOutOfDate).toBe(1);
  const settings = appBuildSettings(project);
  expect(settings).toHaveLength(2);
  for (const configuration of settings) {
    expect(configuration.DEBUG_INFORMATION_FORMAT).toBe('"dwarf-with-dsym"');
  }
  expect(project.getFirstTarget().firstTarget.buildPhases.at(-1).comment).toBe(phaseName);
});

it("prebuild restores the dependency without changing extension configurations or duplicating paths", () => {
  const plugin = require("../withIosSentryDebugSymbols");
  const project = readProject();
  const phase = project.pbxItemByComment(phaseName, "PBXShellScriptBuildPhase");
  phase.inputPaths = ['"$(EXISTING_INPUT)"'];
  for (const configuration of appBuildSettings(project)) {
    configuration.DEBUG_INFORMATION_FORMAT = "dwarf";
  }
  const configurations = project.pbxXCBuildConfigurationSection();
  const extensionDebug = configurations.BD8D1299505C49ABA870A948.buildSettings;
  const existingExtensionFormat = extensionDebug.DEBUG_INFORMATION_FORMAT;
  const target = project.getFirstTarget().firstTarget;
  const sentryPhase = target.buildPhases.find((entry) => entry.comment === phaseName);
  target.buildPhases = [
    sentryPhase,
    ...target.buildPhases.filter((entry) => entry !== sentryPhase),
  ];
  const config = {
    ios: { bundleIdentifier: "app.cookkit.cookkit" },
    modResults: project,
  };

  plugin(config);
  plugin(config);

  expect(phase.inputPaths).toEqual(['"$(EXISTING_INPUT)"', symbolInput]);
  expect(phase.alwaysOutOfDate).toBe(1);
  expect(target.buildPhases.at(-1)).toEqual(sentryPhase);
  expect(target.buildPhases.filter((entry) => entry.comment === phaseName)).toHaveLength(1);
  for (const configuration of appBuildSettings(project)) {
    expect(configuration.DEBUG_INFORMATION_FORMAT).toBe('"dwarf-with-dsym"');
  }
  expect(extensionDebug.DEBUG_INFORMATION_FORMAT).toBe(existingExtensionFormat);
});

it("reports an incorrect prebuild plugin order instead of silently omitting the fix", () => {
  const plugin = require("../withIosSentryDebugSymbols");
  expect(() => plugin({ modResults: { pbxItemByComment: () => undefined } })).toThrow(
    /after.*Sentry/i
  );
});
