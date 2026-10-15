module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo"]],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "~": "./", // or whatever your root folder is
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
    // Strip TypeScript field modifiers before legacy decorators add initializers.
    // WatermelonDB's decorated fields must retain their database accessors.
    overrides: [
      {
        test: (fileName) => !!fileName && fileName.endsWith(".ts"),
        plugins: [
          [
            "@babel/plugin-transform-typescript",
            {
              isTSX: false,
              allowNamespaces: true,
              allowDeclareFields: true,
            },
          ],
        ],
      },
      {
        test: (fileName) => !!fileName && fileName.endsWith(".tsx"),
        plugins: [
          [
            "@babel/plugin-transform-typescript",
            {
              isTSX: true,
              allowNamespaces: true,
              allowDeclareFields: true,
            },
          ],
        ],
      },
      {
        // WatermelonDB models use legacy decorators in app TypeScript.
        // Keep these off node_modules TS: Expo modules TS sources contain
        // `declare` fields that must be stripped by TypeScript first.
        test: (fileName) =>
          !!fileName && !fileName.includes("/node_modules/") && /\.tsx?$/.test(fileName),
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "legacy" }],
          ["@babel/plugin-proposal-class-properties", { loose: true }],
        ],
      },
      {
        // React Native 0.85 and modern deps ship JS sources with private class methods.
        // Keep these transforms off TypeScript files: Expo modules TS sources
        // contain `declare` fields that must be stripped by TS first.
        test: (fileName) => !!fileName && /\.jsx?$/.test(fileName),
        plugins: [
          ["@babel/plugin-transform-private-methods", { loose: true }],
          ["@babel/plugin-transform-private-property-in-object", { loose: true }],
        ],
      },
    ],
  };
};
