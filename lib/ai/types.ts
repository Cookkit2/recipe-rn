/** App-to-server contract. Provider credentials and model selection stay on the server. */
export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  image?: {
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    data: string;
  };
  responseSchema?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
}
