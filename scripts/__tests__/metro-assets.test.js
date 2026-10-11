const { execFileSync } = require("node:child_process");
const path = require("node:path");

it("reads image dimensions through Metro's filename and buffer asset APIs", () => {
  const result = execFileSync(
    process.execPath,
    [
      "-e",
      `
        const fs = require('node:fs');
        const path = require('node:path');
        const assets = require('metro/private/Assets');
        const file = path.resolve('node_modules/expo-router/assets/pkg.png');
        (async () => {
          const bufferSize = assets.getAssetSize('png', fs.readFileSync(file), file);
          const data = await assets.getAssetData(file, 'node_modules/expo-router/assets/pkg.png', [], 'ios', '/assets');
          console.log(JSON.stringify({ bufferSize, width: data.width, height: data.height, files: data.files }));
        })().catch(error => { console.error(error); process.exitCode = 1; });
      `,
    ],
    { cwd: path.resolve(__dirname, "../.."), encoding: "utf8", timeout: 10000 }
  );
  const data = JSON.parse(result);
  expect(data.bufferSize).toEqual({ width: 48, height: 48 });
  expect(data.width).toBe(48);
  expect(data.height).toBe(48);
  expect(data.files).toContain(
    path.resolve(__dirname, "../../node_modules/expo-router/assets/pkg.png")
  );
});
