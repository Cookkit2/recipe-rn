const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    owner: "gihming",
    extra: {
      ...(appJson.expo.extra ?? {}),
      eas: {
        projectId: "191bf781-c649-4520-84d0-461f5b5a8427",
      },
      EXPO_PUBLIC_E2E: process.env.EXPO_PUBLIC_E2E,
    },
  },
};
