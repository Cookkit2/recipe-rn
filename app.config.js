const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      EXPO_PUBLIC_E2E: process.env.EXPO_PUBLIC_E2E,
    },
  },
};
