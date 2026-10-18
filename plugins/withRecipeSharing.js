const { withXcodeProject } = require("expo/config-plugins");
const withSharing = require("expo-sharing/app.plugin").default;
const fs = require("fs");
const path = require("path");
const plist = require("@expo/plist").default;

function customizeExtension(platformRoot) {
  const directory = path.join(platformRoot, "expo-sharing-extension");
  const infoPath = path.join(directory, "Info.plist");
  const info = plist.parse(fs.readFileSync(infoPath, "utf8"));
  info.CFBundleDisplayName = "Cookkit Import";
  fs.writeFileSync(infoPath, plist.build(info));

  const controllerPath = path.join(directory, "ShareIntoViewController.swift");
  let source = fs.readFileSync(controllerPath, "utf8");
  if (!source.includes("Cookkit: preserve shared captions")) {
    const items = "    for item in items {\n";
    const payload = "          results.append(payload)\n";
    if (!source.includes(items) || !source.includes(payload))
      throw new Error(
        "Expo Sharing's extension template changed; review caption handling before rebuilding."
      );
    source = source.replace(
      items,
      `${items}      // Cookkit: preserve shared captions alongside URL attachments.
      if let caption = item.attributedContentText?.string,
         !caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        results.append(SharePayload(type: .text, value: caption, mimeType: "text/plain", metadata: nil))
      }
`
    );
    source = source.replace(
      payload,
      `${payload}          if payload.type == .url,
             provider.hasItemConformingToTypeIdentifier(UTType.text.identifier),
             let caption = await handleText(provider), caption.value != payload.value {
            results.append(caption)
          }
`
    );
    fs.writeFileSync(controllerPath, source);
  }
}

module.exports = function withRecipeSharing(config, options) {
  // Apply Cookkit's iPhone-only build settings after the extension is generated.
  config = withXcodeProject(config, (config) => {
    customizeExtension(config.modRequest.platformProjectRoot);
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const entry of Object.values(configurations)) {
      const settings = entry.buildSettings;
      if (!settings || !String(settings.INFOPLIST_FILE).includes("expo-sharing-extension/"))
        continue;
      settings.TARGETED_DEVICE_FAMILY = "1";
      settings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
      settings.INFOPLIST_KEY_CFBundleDisplayName = '"Cookkit Import"';
    }
    return config;
  });
  return withSharing(config, options);
};

module.exports.customizeExtension = customizeExtension;
