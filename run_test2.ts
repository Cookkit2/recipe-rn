export function splitTranscript(transcript: string): string[] {
  return transcript
    .replace(/(?:\b|^)(and|plus|also)(?:\b|$)/gi, ",")
    .split(/(?:[,;\n]+|(?<=\b)(?:and|plus|also)(?=\b))/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

console.log(splitTranscript("and milk,"));
