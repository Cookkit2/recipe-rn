const fs = require("fs");
const os = require("os");
const path = require("path");
const plist = require("@expo/plist").default;
const { customizeExtension } = require("../withRecipeSharing");

it("preserves captions and the friendly name when generating the real SDK 58 extension", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cookkit-sharing-test-"));
  try {
    const target = path.join(root, "expo-sharing-extension");
    fs.mkdirSync(target);
    const packageRoot = path.dirname(require.resolve("expo-sharing/package.json"));
    const controller = path.join(target, "ShareIntoViewController.swift");
    fs.copyFileSync(
      path.join(packageRoot, "plugin/template-files/ios/ShareIntoViewController.swift"),
      controller
    );
    fs.writeFileSync(
      path.join(target, "Info.plist"),
      plist.build({ CFBundleDisplayName: "$(PRODUCT_NAME)" })
    );
    customizeExtension(root);
    const generated = fs.readFileSync(controller, "utf8");
    expect(generated).toContain("item.attributedContentText?.string");
    expect(generated).toContain("let caption = await handleText(provider)");
    expect(
      plist.parse(fs.readFileSync(path.join(target, "Info.plist"), "utf8")).CFBundleDisplayName
    ).toBe("Cookkit Import");
    customizeExtension(root);
    expect(fs.readFileSync(controller, "utf8")).toBe(generated);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
