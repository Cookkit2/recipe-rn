import Constants from "expo-constants";

const API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

interface ModelListResponse {
  models: Array<{
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    temperature: number;
    topP: number;
    topK: number;
  }>;
}

export class GeminiAPI {
  /**
   * Generate content using Gemini API
   */
  async generateContent(
    model: string = "gemini-2.0-flash",
    body: string
  ): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY,
        },
        body: body,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response generated from Gemini API");
    }

    const candidate = data.candidates[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response format from Gemini API");
    }

    return candidate.content.parts[0].text;
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelListResponse> {
    const response = await fetch(`${BASE_URL}/models`, {
      method: "GET",
      headers: {
        "X-goog-api-key": API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}

// Simple helper function for quick content generation
export const generateGeminiContent = async (body: string): Promise<string> => {
  const client = new GeminiAPI();
  return await client.generateContent("gemini-2.0-flash-lite-001", body);
};
