const { withUniwindConfig } = require('uniwind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add WatermelonDB support
config.resolver.platforms = [...config.resolver.platforms, 'native', 'ios', 'android'];

// Add onnx, tflite, and video asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'onnx', 'tflite', 'mp4'];

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: './global.css',
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: './uniwind-types.d.ts',
  polyfills:{ rem: 14 }
});
