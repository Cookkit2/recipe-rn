/** @type {import("jest").Config} */
module.exports = {
  rootDir: "..",
  testRunner: "jest-circus/runner",
  testMatch: ["<rootDir>/e2e/scenarios/**/*.e2e.ts"],
  // Cold launch on the iOS 26 simulator includes SpringBoard permission grants
  // that have exceeded 120s. Hooks in e2e/setup.js use the same budget.
  testTimeout: 300000,
  maxWorkers: 1,
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/e2e/setup.js"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/e2e/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
  },
};
