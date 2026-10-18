function decodeText(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    nbsp: " ",
    lt: "<",
    gt: ">",
    frac12: "½",
    frac14: "¼",
    frac34: "¾",
  };
  return value
    .replace(/&(#x[\da-f]+|#\d+|[a-z\d]+);/gi, (entity, name: string) => {
      if (!name.startsWith("#")) return named[name.toLowerCase()] ?? entity;
      const code =
        name.slice(0, 2).toLowerCase() === "#x"
          ? parseInt(name.slice(2), 16)
          : Number(name.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : entity;
    })
    .trim();
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    if (match[1]) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return result;
}

/** Extract only published page text; login walls still require a pasted caption. */
export function extractSocialMetadata(html: string): { title: string; description: string } {
  const metadata = new Map<string, string>();
  const descriptions: string[] = [];
  const source = html.slice(0, 2_000_000);
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content) metadata.set(key.toLowerCase(), decodeText(attrs.content));
  }
  let title = metadata.get("og:title") ?? metadata.get("twitter:title") ?? "";
  for (const key of ["og:description", "twitter:description", "description"]) {
    const text = metadata.get(key);
    if (text) descriptions.push(text);
  }
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 6) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    const entry = value as Record<string, unknown>;
    for (const key of ["articleBody", "caption", "text", "description"]) {
      if (typeof entry[key] === "string") descriptions.push(decodeText(entry[key]));
    }
    if (!title && typeof entry.name === "string") title = decodeText(entry.name);
    for (const key of ["@graph", "mainEntity", "video"]) visit(entry[key], depth + 1);
  };
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1] ?? "").type?.toLowerCase() !== "application/ld+json") continue;
    try {
      visit(JSON.parse(match[2] ?? ""));
    } catch {
      /* Ignore malformed metadata. */
    }
  }
  const description = descriptions.reduce(
    (longest, text) => (text.length > longest.length ? text : longest),
    ""
  );
  return { title, description: description.slice(0, 32000) };
}
