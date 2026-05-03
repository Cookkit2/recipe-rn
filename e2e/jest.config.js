/** @type {import("jest").Config} */
module.exports = {
  rootDir: "..",
  testRunner: "jest-circus/runner",
  testMatch: ["<rootDir>/e2e/scenarios/**/*.e2e.ts"],
  testTimeout: 120000,
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
