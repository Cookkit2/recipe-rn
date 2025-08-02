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
    // Exclude placeholder implementations from coverage
    "!data/storage/implementations/async-storage-impl.ts",
    "!data/storage/implementations/sqlite-storage.ts", 
    "!data/storage/implementations/watermelon-storage.ts",
    "!data/storage/implementations/realm-storage.ts",
    "!data/storage/index.ts", // Re-exports only
    "!data/repositories/recipe-repository.ts", // Not used in main app yet
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 50,
      lines: 60,
      statements: 60,
    },
    // Specific thresholds for core storage components (these should be high)
    "data/storage/storage-facade.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "data/storage/implementations/mmkv-storage.ts": {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-mmkv)/)",
  ],
  testEnvironment: "node",
};