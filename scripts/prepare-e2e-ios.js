const fs = require("node:fs");
const path = require("node:path");

const marker = "# Cookkit Detox embedded bundle";
const override = `${marker}
if [ "$EXPO_PUBLIC_E2E" = "true" ]; then
  unset SKIP_BUNDLING
  export FORCE_BUNDLING=1
  export EXTRA_PACKAGER_ARGS="\${EXTRA_PACKAGER_ARGS:-} --dev false"
fi
`;

function prepareE2EIos(target = path.resolve(__dirname, "../ios/.xcode.env.updates")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const existingOverride =
    /# Cookkit Detox embedded bundle\nif \[ "\$EXPO_PUBLIC_E2E" = "true" \]; then\n[\s\S]*?\nfi\n?/;
  if (current.includes(marker) && !existingOverride.test(current)) {
    throw new Error("Malformed Cookkit Detox bundle override; preserve the file for review");
  }
  const updated = existingOverride.test(current)
    ? current.replace(existingOverride, override)
    : current + (current.endsWith("\n") || !current ? "" : "\n") + override;
  if (updated !== current) fs.writeFileSync(target, updated);
}

if (require.main === module) prepareE2EIos();
module.exports = { prepareE2EIos };
