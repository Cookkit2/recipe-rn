const plugin = require("tailwindcss");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "~": "./", // or whatever your root folder is
          },
        },
      ],
      "react-native-worklets-core/plugin",
      "react-native-reanimated/plugin",
    ],
  };
};
