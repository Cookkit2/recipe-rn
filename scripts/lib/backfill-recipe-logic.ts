/**
 * Pure helpers for the recipe-image backfill script. No I/O, no Supabase import,
 * so they are fully unit-testable. See scripts/backfill-recipe-images.ts for the
 * orchestrator that consumes them.
 */

export interface CliOptions {
  dryRun: boolean;
  limit: number | undefined;
  quality: number;
  maxWidth: number | undefined;
  concurrency: number;
}

export type MigrationAction = "skip_empty" | "skip_webp" | "migrate";

export interface MigrationDecision {
  action: MigrationAction;
}

const DEFAULTS: CliOptions = {
  dryRun: false,
  limit: undefined,
  quality: 85,
  maxWidth: undefined,
  concurrency: 5,
};

function requireInt(name: string, raw: string | undefined): number {
  if (raw === undefined) throw new Error(`Missing value for ${name}`);
  // Strict decimal integer check: reject hex (0x10), scientific (1e2), and "" -> 0.
  if (!/^-?\d+$/.test(raw)) throw new Error(`Expected integer for ${name}, got: ${raw}`);
  return Number(raw);
}

/** Parse the script's CLI args. Supports `--flag value` and `--flag=value`. */
export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--limit") {
      opts.limit = requireInt(a, argv[i + 1]);
      i++;
    } else if (a.startsWith("--limit=")) {
      opts.limit = requireInt("--limit", a.slice("--limit=".length));
    } else if (a === "--quality") {
      opts.quality = requireInt(a, argv[i + 1]);
      i++;
    } else if (a.startsWith("--quality=")) {
      opts.quality = requireInt("--quality", a.slice("--quality=".length));
    } else if (a === "--max-width") {
      opts.maxWidth = requireInt(a, argv[i + 1]);
      i++;
    } else if (a.startsWith("--max-width=")) {
      opts.maxWidth = requireInt("--max-width", a.slice("--max-width=".length));
    } else if (a === "--concurrency") {
      opts.concurrency = requireInt(a, argv[i + 1]);
      i++;
    } else if (a.startsWith("--concurrency=")) {
      opts.concurrency = requireInt("--concurrency", a.slice("--concurrency=".length));
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  // Range validation: prevent silent no-ops (e.g. --concurrency=0 processing nothing).
  if (opts.concurrency < 1) throw new Error(`--concurrency must be >= 1`);
  if (opts.limit !== undefined && opts.limit < 1) throw new Error(`--limit must be >= 1`);
  if (opts.quality < 1 || opts.quality > 100)
    throw new Error(`--quality must be between 1 and 100`);
  if (opts.maxWidth !== undefined && opts.maxWidth < 1) throw new Error(`--max-width must be >= 1`);
  return opts;
}

/** Public object URL prefix for a bucket, e.g. `https://x.supabase.co/storage/v1/object/public/recipe-images/`. */
export function getBucketPublicHost(supabaseUrl: string, bucket: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/`;
}

/** True if a URL points at a .webp object (query/hash stripped). */
function isWebpObjectUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0] ?? "";
  return path.toLowerCase().endsWith(".webp");
}

/**
 * Decide whether a recipe row should be migrated or skipped.
 * - skip_empty: null/empty image_url.
 * - skip_webp: already an in-bucket .webp object (fully converted).
 * - migrate: an external URL, OR an in-bucket non-webp object that needs recompression.
 */
export function decideMigration(
  imageUrl: string | null | undefined,
  bucketHost: string
): MigrationDecision {
  if (imageUrl === null || imageUrl === undefined) return { action: "skip_empty" };
  const trimmed = imageUrl.trim();
  if (trimmed.length === 0) return { action: "skip_empty" };
  if (trimmed.startsWith(bucketHost)) {
    return isWebpObjectUrl(trimmed) ? { action: "skip_webp" } : { action: "migrate" };
  }
  return { action: "migrate" };
}

/** Object key (path within bucket) for a URL already in our bucket, or null if external/empty.
 *  Query stripped; the path is URI-decoded so keys with spaces/special chars round-trip correctly
 *  (extracting verbatim from the URL and re-uploading would double-encode them). */
export function objectPathFromUrl(
  imageUrl: string | null | undefined,
  bucketHost: string
): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith(bucketHost)) return null;
  const rawPath = trimmed.slice(bucketHost.length).split("?")[0] ?? "";
  if (rawPath.length === 0) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath; // malformed %-sequence — fall back to the raw path
  }
}

/** Swap a storage object path's extension to .webp (foo.jpg -> foo.webp; no-ext -> foo.webp). */
export function swapExtensionToWebp(objectPath: string): string {
  const noQuery = objectPath.split("?")[0] ?? objectPath;
  const dot = noQuery.lastIndexOf(".");
  if (dot <= 0) return `${noQuery}.webp`;
  return `${noQuery.slice(0, dot)}.webp`;
}

/** Target storage key for the converted object: preserve an in-bucket key (swap ext), else <id>.webp. */
export function targetKeyFor(
  imageUrl: string | null | undefined,
  bucketHost: string,
  recipeId: string
): string {
  const existing = objectPathFromUrl(imageUrl, bucketHost);
  return existing ? swapExtensionToWebp(existing) : objectKeyFor(recipeId);
}

/** Storage object key within the bucket for a given recipe id. */
export function objectKeyFor(recipeId: string): string {
  return `${recipeId}.webp`;
}

/** Bytes saved by conversion, never negative. */
export function bytesSaved(beforeBytes: number, afterBytes: number): number {
  return Math.max(0, beforeBytes - afterBytes);
}
