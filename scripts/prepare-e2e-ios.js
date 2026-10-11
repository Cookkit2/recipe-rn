const fs = require("node:fs");
const path = require("node:path");

const marker = "# Cookkit Detox embedded bundle";
const override = `${marker}
if [ "$EXPO_PUBLIC_E2E" = "true" ]; then
  unset SKIP_BUNDLING
  export FORCE_BUNDLING=1
fi
`;

function prepareE2EIos(target = path.resolve(__dirname, "../ios/.xcode.env.updates")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (!current.includes(marker)) {
    fs.writeFileSync(target, current + (current.endsWith("\n") || !current ? "" : "\n") + override);
  }
}

if (require.main === module) prepareE2EIos();
module.exports = { prepareE2EIos };
