/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/Cookkit.app",
      build:
        "EXPO_PUBLIC_E2E=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/Cookkit.app",
      build:
        "EXPO_PUBLIC_E2E=true xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone Air",
        os: "iOS 26.2",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
  },
};
