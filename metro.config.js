const { withNativeWind } = require("nativewind/metro");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Add WatermelonDB support
config.resolver.platforms = [
  ...config.resolver.platforms,
  "native",
  "ios",
  "android",
];

// Add onnx, tflite, and video asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, "onnx", "tflite", "mp4"];

module.exports = withNativeWind(config, {
  input: "./global.css",
});