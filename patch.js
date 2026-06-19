const fs = require("fs");
const file = "package.json";
let packageJson = JSON.parse(fs.readFileSync(file, "utf8"));

packageJson.overrides = packageJson.overrides || {};
packageJson.overrides["form-data"] = "^4.0.6";

fs.writeFileSync(file, JSON.stringify(packageJson, null, 2));
