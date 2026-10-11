/** @type {import("detox").DetoxConfig} */
module.exports = {
  testRunner: { args: { config: "e2e/jest.config.js" }, jest: { setupTimeout: 120000 } },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "build/e2e/Build/Products/Debug-iphonesimulator/Cookkit.app",
      build:
        "node scripts/prepare-e2e-ios.js && EXPO_PUBLIC_E2E=true FORCE_BUNDLING=1 SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/e2e CODE_SIGNING_ALLOWED=NO",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "build/e2e/Build/Products/Release-iphonesimulator/Cookkit.app",
      build:
        "node scripts/prepare-e2e-ios.js && EXPO_PUBLIC_E2E=true FORCE_BUNDLING=1 SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/e2e CODE_SIGNING_ALLOWED=NO",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: process.env.DETOX_DEVICE_TYPE || "iPhone Air",
        ...(process.env.DETOX_DEVICE_OS ? { os: process.env.DETOX_DEVICE_OS } : {}),
      },
    },
  },
  configurations: {
    "ios.sim.debug": { device: "simulator", app: "ios.debug" },
    "ios.sim.release": { device: "simulator", app: "ios.release" },
  },
};
