import { getCaptionInstructions } from "../shared/instruction-evidence";

/** Merge public caption actions and frame observations using their actual video times. */
export function getYouTubeInstructionEvidence(
  source: string
): { quote: string; timestamp?: number }[] {
  const found = new Map<string, { quote: string; timestamp?: number }>();
  for (const section of source.split(/(?=At \d+(?:\.\d+)? seconds?,\s*|\[\d+(?:\.\d+)?s\]\s*)/gi)) {
    const marker = section.match(/^(?:At (\d+(?:\.\d+)?) seconds?,\s*|\[(\d+(?:\.\d+)?)s\]\s*)/i);
    const timestamp = marker ? Number(marker[1] ?? marker[2]) : undefined;
    for (const quote of getCaptionInstructions(section.slice(marker?.[0].length ?? 0))) {
      const key = quote
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      const previous = found.get(key);
      if (!previous || (previous.timestamp === undefined && timestamp !== undefined))
        found.set(key, { quote, timestamp });
    }
  }
  let characters = 0;
  return [...found.values()]
    .sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity))
    .filter(({ quote }, index) => {
      characters += quote.length;
      return index < 24 && characters <= 6000;
    });
}
