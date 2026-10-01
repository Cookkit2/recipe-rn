export default {
  expoConfig: {
    extra: {
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "test-mock-api-key",
    },
  },
};
