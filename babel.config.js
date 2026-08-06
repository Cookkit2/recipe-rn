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
    // Workaround for WatermelonDB decorator fields: `@field("x") x!: string;`
    // Babel's @babel/plugin-transform-typescript throws "Definitely assigned fields
    // cannot be initialized here" because the legacy decorators plugin transforms
    // class fields before TypeScript sees them. Adding allowDeclareFields prevents
    // the error by telling the TS transform to leave definite-assigned fields alone.
    overrides: [
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
    ],
  };
};
