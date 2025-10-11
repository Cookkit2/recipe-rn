import Constants from "expo-constants";

const API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GROQ_API_KEY;

const BASE_URL = "https://api.groq.com/openai/v1";

interface GroqMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface GroqRequestBody {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GroqAPI {
  /**
   * Generate content using Groq API with vision support
   */
  async generateContent(
    model: string = "meta-llama/llama-4-maverick-17b-128e-instruct",
    requestBody: GroqRequestBody
  ): Promise<string> {
    if (!API_KEY) {
      throw new Error("Groq API key is not set");
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        ...requestBody,
        model,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: response.url,
      });
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data: GroqResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response generated from Groq API");
    }

    const choice = data.choices[0];
    if (!choice?.message?.content) {
      throw new Error("Invalid response format from Groq API");
    }

    return choice.message.content;
  }
}

// Helper function for quick content generation with vision
export const generateGroqVisionContent = async (
  imageBase64: string,
  prompt: string,
  model: string = "llama-3.2-11b-vision-preview"
): Promise<string> => {
  const client = new GroqAPI();
  return await client.generateContent(model, {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 100,
  });
};

