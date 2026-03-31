import { GeminiAPI, calculateTokenCost, generateGeminiContent, } from "../gemini-api";
import { log } from "~/utils/logger";
import Constants from "expo-constants";

// Mock global fetch
global.fetch = jest.fn();

// Mock dependencies
jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Setup initial API_KEY expectation for our tests
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY;

describe("gemini-api", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateTokenCost", () => {
    it("should calculate correct token cost based on PRICING constants", () => {
      const usage = {
        promptTokenCount: 2_000_000,
        candidatesTokenCount: 1_000_000,
      };

      const result = calculateTokenCost(usage);

      // Prompt cost: (2,000,000 / 1,000,000) * 0.075 = 0.15
      // Candidates cost: (1,000,000 / 1,000,000) * 0.3 = 0.30
      // Total estimated cost: 0.15 + 0.30 = 0.45

      expect(result.promptTokenCount).toBe(2_000_000);
      expect(result.candidatesTokenCount).toBe(1_000_000);
      expect(result.totalTokenCount).toBe(3_000_000);
      expect(result.estimatedCost).toBeCloseTo(0.45);
    });

    it("should handle zero tokens", () => {
      const usage = {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
      };

      const result = calculateTokenCost(usage);

      expect(result.totalTokenCount).toBe(0);
      expect(result.estimatedCost).toBe(0);
    });
  });

  describe("GeminiAPI", () => {
    let api: GeminiAPI;

    beforeEach(() => {
      api = new GeminiAPI();
    });

    describe("generateContent", () => {
      it("should successfully generate content and return text", async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [{ text: "This is a mock response from Gemini" }],
                role: "model",
              },
            },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await api.generateContent("gemini-2.0-flash", "Hello");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": API_KEY,
            },
            body: "Hello",
          })
        );
        expect(result).toBe("This is a mock response from Gemini");
      });

      it("should log usage metadata if provided", async () => {
        const mockResponse = {
          candidates: [
            {
              content: { parts: [{ text: "Mock text" }] },
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await api.generateContent("gemini-2.0-flash", "Hello");

        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Gemini API Token Usage"));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Prompt: 100"));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Candidates: 50"));
      });

      it("should throw and log error with redacted API key when fetch fails", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => `Bad request for API key ${API_KEY}`,
        });

        await expect(api.generateContent("gemini-2.0-flash", "Hello")).rejects.toThrow(
          "Gemini API request failed. Please try again later."
        );

        expect(log.error).toHaveBeenCalledWith(
          expect.stringContaining("Gemini API error: 400 - Bad request for API key [REDACTED_API_KEY]")
        );
        expect(log.error).not.toHaveBeenCalledWith(expect.stringContaining(API_KEY as string));
      });

      it("should throw if response has no candidates", async () => {
        const mockResponse = { candidates: [] };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await expect(api.generateContent("gemini-2.0-flash", "Hello")).rejects.toThrow(
          "No response generated from Gemini API"
        );
      });

      it("should throw if response format is invalid (missing parts)", async () => {
        const mockResponse = {
          candidates: [
            {
              content: {}, // Missing parts
            },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await expect(api.generateContent("gemini-2.0-flash", "Hello")).rejects.toThrow(
          "Invalid response format from Gemini API"
        );
      });

      it("should respect the AbortSignal passed by caller", async () => {
        const controller = new AbortController();
        const signal = controller.signal;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Ok" }] } }]
          })
        });

        await api.generateContent("gemini-2.0-flash", "Hello", signal);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ signal })
        );
      });
    });

    describe("listModels", () => {
      it("should successfully list models", async () => {
        const mockResponse = {
          models: [
            { name: "models/gemini-2.0-flash", version: "001" },
            { name: "models/gemini-pro", version: "001" },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await api.listModels();

        expect(global.fetch).toHaveBeenCalledWith(
          "https://generativelanguage.googleapis.com/v1beta/models",
          expect.objectContaining({
            method: "GET",
            headers: {
              "X-goog-api-key": API_KEY,
            },
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it("should throw and log error with redacted API key when listModels fails", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => `Forbidden: ${API_KEY} is invalid`,
        });

        await expect(api.listModels()).rejects.toThrow(
          "Gemini API request failed. Please try again later."
        );

        expect(log.error).toHaveBeenCalledWith(
          expect.stringContaining("Gemini API error: 403 - Forbidden: [REDACTED_API_KEY] is invalid")
        );
      });
    });
  });

  describe("generateGeminiContent (helper)", () => {
    it("should instantiate GeminiAPI and call generateContent with default model", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { parts: [{ text: "Helper response" }] },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateGeminiContent("Hello helper");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent",
        expect.objectContaining({
          body: "Hello helper",
        })
      );
      expect(result).toBe("Helper response");
    });
  });
});

describe("GeminiAPI missing API KEY", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw an error if API_KEY is missing", async () => {
    let localApi: any;

    // Completely unmock the expo-constants and then isolate module
    // the previous test mocked expo-constants, we want the empty mock now
    jest.isolateModules(() => {
      // Remove API keys from env
      process.env.EXPO_PUBLIC_GEMINI_API_KEY = "";

      // Override the module mock for this specific isolated module environment
      jest.doMock("expo-constants", () => ({
        expoConfig: { extra: { EXPO_PUBLIC_GEMINI_API_KEY: undefined } }
      }));

      const { GeminiAPI } = require("../gemini-api");
      localApi = new GeminiAPI();
    });

    await expect(localApi.generateContent("model", "body")).rejects.toThrow("Gemini API key is not set");
  });
});
