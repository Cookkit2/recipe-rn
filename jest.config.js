module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/node_modules/react-native/jest/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.(js|jsx|ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        },
      },
    ],
    "^.+\\.(js|jsx)$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@nozbe|@expo|expo|expo-modules-core|expo-constants|expo-auth-session|expo-linking|react-navigation|react-native-reanimated|react-native-worklets|@rn-primitives|llama\\.rn|expo-file-system|@testing-library)/)",
  ],
  moduleNameMapper: {
    "^expo-constants$": "<rootDir>/__mocks__/expo-constants.ts",
    "^~/(.*)$": "<rootDir>/$1",
    "^@sentry/react-native$": "<rootDir>/__mocks__/@sentry/react-native.ts",
  },
  collectCoverageFrom: [
    "utils/**/*.{ts,tsx}",
    "data/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "auth/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/__tests__/**",
    "!**/node_modules/**",
    "!data/db/database.ts",
    "!data/db/migrations/**",
  ],
  // Legacy src/ auth tests target an unused pre-router auth stack with incompatible native mocks.
  // Keep them out of default PR CI until the legacy stack is deleted or migrated.
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.expo/",
    "/src/store/__tests__/",
    "/src/screens/auth/__tests__/",
    "/src/contexts/__tests__/",
    "/src/services/database/__tests__/",
  ],
};
