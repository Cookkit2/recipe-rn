module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "data/storage/**/*.ts",
    "data/repositories/**/*.ts",
    "data/pantry-repository.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-mmkv)/)",
  ],
  testEnvironment: "node",
};