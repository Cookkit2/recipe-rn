module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.(js|jsx|ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@nozbe|@expo|expo|expo-modules-core|expo-constants|react-navigation)/)",
  ],
  moduleNameMapper: {
    "^expo-constants$": "<rootDir>/test/mocks/expo-constants.ts",
    "^~/(.*)$": "<rootDir>/$1",
    "^@sentry/react-native$": "<rootDir>/test/mocks/sentry-react-native.ts",
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
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
