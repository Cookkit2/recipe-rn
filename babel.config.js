module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo"]],
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
      "react-native-reanimated/plugin",
    ],
    // Fix WatermelonDB decorator fields: `@field("x") x!: string;`
    // Babel's @babel/plugin-transform-typescript throws "Definitely assigned fields
    // cannot be initialized here" because the legacy decorators plugin transforms
    // class fields before TypeScript sees them. Adding allowDeclareFields prevents
    // the error by telling the TS transform to leave definite-assigned fields alone.
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
    ],
  };
};
