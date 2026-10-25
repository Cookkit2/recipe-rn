import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const { transformSync } = require("@babel/core");
const { expoInlineEnvVars } = require("babel-preset-expo/build/plugins/inline-env-vars");

it("reads Expo-inlined config without a runtime environment", () => {
  const values = {
    EXPO_PUBLIC_NEBIUS_API_KEY: "placeholder-key",
    EXPO_PUBLIC_NEBIUS_MODEL: "test-model",
    EXPO_PUBLIC_NEBIUS_BASE_URL: "https://example.test/v1/",
  };
  const previous = { ...process.env };
  try {
    Object.assign(process.env, values);
    const result = transformSync(readFileSync(resolve(__dirname, "../nebius-config.ts"), "utf8"), {
      configFile: false,
      babelrc: false,
      filename: "nebius-config.ts",
      caller: { name: "metro", isDev: false },
      plugins: [
        "@babel/plugin-transform-typescript",
        expoInlineEnvVars,
        "@babel/plugin-transform-modules-commonjs",
      ],
    });
    const output = { exports: {} as typeof import("../nebius-config") };
    runInNewContext(result.code, { exports: output.exports, process: { env: {} } });
    expect(output.exports.readNebiusAgentConfig()).toEqual({
      apiKey: values.EXPO_PUBLIC_NEBIUS_API_KEY,
      model: values.EXPO_PUBLIC_NEBIUS_MODEL,
      baseURL: "https://example.test/v1",
    });
  } finally {
    process.env = previous;
  }
});
