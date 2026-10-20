const {
  PREFERRED_SIMULATOR_OS,
  PREFERRED_SIMULATOR_TYPE,
} = require("./scripts/select-e2e-simulator.cjs");

function configuredValue(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

// ios.sim.debug targets iPhone Air / iOS 26.2. The E2E workflow sets
// DETOX_SIMULATOR_TYPE and DETOX_SIMULATOR_OS when that device is not available.
const simulatorType = configuredValue("DETOX_SIMULATOR_TYPE", PREFERRED_SIMULATOR_TYPE);
const simulatorOS = configuredValue("DETOX_SIMULATOR_OS", PREFERRED_SIMULATOR_OS);

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/Cookkit.app",
      build:
        ". ./scripts/e2e-ios-env.sh && xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/Cookkit.app",
      build:
        ". ./scripts/e2e-ios-env.sh && xcodebuild -workspace ios/Cookkit.xcworkspace -scheme Cookkit -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -quiet",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: simulatorType,
        os: simulatorOS,
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
