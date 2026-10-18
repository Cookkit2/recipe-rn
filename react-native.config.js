module.exports = {
  dependencies: {
    // Android already uses safe-area insets; only iOS needs this legacy module.
    "react-native-screen-corner-radius": { platforms: { android: null } },
  },
};
