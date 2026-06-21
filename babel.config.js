module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo"]],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-proposal-class-properties", { loose: true }], // WatermelonDB: class-properties MUST run after decorators
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
  };
};
