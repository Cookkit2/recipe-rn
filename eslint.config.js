// eslint.config.js (Flat Config for ESLint v9)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactNative from "eslint-plugin-react-native";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  js.configs.recommended,
  // perfectionist.configs["recommended-natural"],
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "android/**",
      "ios/**",
      "coverage/**",
      "dist/**",
      "build/**",
      ".expo/**",
      "*.config.js",
      "metro.config.js",
      "babel.config.js",
      "tailwind.config.js",
      "examples/**",
      "docs/**",
      "*.generated.*",
      "*.min.js",
      "package-lock.json",
      "yarn.lock",
      "bun.lockb",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React Native globals
        __DEV__: "readonly",
        console: "readonly",
        document: "readonly",
        window: "readonly",
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        ...globals.browser,
        NodeJS: "readonly",
      },
    },
    plugins: {
      react,
      "react-native": reactNative,
      "react-hooks": reactHooks,
    },
    rules: {
      // React rules
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
      "react/prop-types": "off", // Not needed with TypeScript
      "react/display-name": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Native specific rules
      "react-native/no-unused-styles": "error",
      "react-native/split-platform-components": "error",
      "react-native/no-inline-styles": "warn",
      "react-native/no-color-literals": "warn",
      "react-native/no-raw-text": "off", // Can be too strict

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off", // Allow require for dynamic imports
      "@typescript-eslint/ban-ts-comment": "warn",

      // General rules
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-undef": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "__tests__/**/*",
    ],
    languageOptions: {
      globals: {
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        // React Native globals
        __DEV__: "readonly",
        console: "readonly",
        global: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Allow any in tests
      "no-console": "off", // Allow console in tests
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
      "no-undef": "off", // Jest globals are handled above
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  prettier,
];
