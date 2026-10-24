export interface AIImage {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
}

/** App-to-server contract. Provider credentials and model selection stay on the server. */
export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  image?: AIImage;
  images?: AIImage[];
  responseSchema?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  inputImageCount?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
}
