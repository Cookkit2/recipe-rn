/** Loopback-only development server. Production uses the authenticated Supabase function. */
import { createServer } from "node:http";
import { createAIHandler } from "../server/ai-handler";

const apiKey = process.env.NEBIUS_API_KEY;
if (!apiKey) throw new Error("Set server-only NEBIUS_API_KEY in .env.local before running ai:dev.");
const handler = createAIHandler({
  apiKey,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_YOUTUBE_MODEL,
  authenticate: async () => "local-development",
  consumeQuota: async () => true,
});

createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of incoming) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > 2_000_000) {
        outgoing.writeHead(413).end("Request too large.");
        return;
      }
      chunks.push(buffer);
    }
    const controller = new AbortController();
    outgoing.on("close", () => {
      if (!outgoing.writableEnded) controller.abort();
    });
    const request = new Request("http://127.0.0.1:8787/ai", {
      method: incoming.method,
      headers: { Authorization: "Bearer local-development", "Content-Type": "application/json" },
      body: incoming.method === "POST" ? Buffer.concat(chunks) : undefined,
      signal: controller.signal,
    });
    const response = await handler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500).end("Local AI proxy request failed.");
  }
}).listen(8787, "127.0.0.1", () => {
  console.log("Cookkit AI proxy: http://127.0.0.1:8787/ai (loopback only)");
});
