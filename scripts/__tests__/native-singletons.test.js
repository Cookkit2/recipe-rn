const { execFileSync } = require("node:child_process");
const path = require("node:path");

it("resolves one native screens implementation for the app and Expo Router", () => {
  const result = execFileSync(
    process.execPath,
    [
      "-e",
      `
    const path = require('node:path');
    const app = require.resolve('react-native-screens/package.json');
    const router = require.resolve('expo-router/package.json');
    const nested = require.resolve('react-native-screens/package.json', { paths: [path.dirname(router)] });
    console.log(JSON.stringify({ app, nested }));
  `,
    ],
    { cwd: path.resolve(__dirname, "../.."), encoding: "utf8", timeout: 10000 }
  );
  const { app, nested } = JSON.parse(result);
  expect(nested).toBe(app);
});
