export interface AIImage {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
}

/** App-to-server contract. Provider credentials and model selection stay on the server. */
export interface AIRequest {
  prompt: string;
  /** Canonical YouTube watch URL; the server routes this input to video analysis. */
  youtubeVideoUrl?: string;
  systemPrompt?: string;
  image?: AIImage;
  images?: AIImage[];
  responseSchema?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  inputImageCount?: number;
  inputVideoUrl?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
}
