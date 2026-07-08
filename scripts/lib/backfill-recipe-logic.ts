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

export type MigrationAction = "skip_empty" | "skip_migrated" | "migrate";

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
  if (opts.maxWidth !== undefined && opts.maxWidth < 1)
    throw new Error(`--max-width must be >= 1`);
  return opts;
}

/** Public object URL prefix for a bucket, e.g. `https://x.supabase.co/storage/v1/object/public/recipe-images/`. */
export function getBucketPublicHost(supabaseUrl: string, bucket: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/`;
}

/** Decide whether a recipe row should be migrated, skipped as empty, or skipped as already migrated. */
export function decideMigration(
  imageUrl: string | null | undefined,
  bucketHost: string
): MigrationDecision {
  if (imageUrl === null || imageUrl === undefined) return { action: "skip_empty" };
  const trimmed = imageUrl.trim();
  if (trimmed.length === 0) return { action: "skip_empty" };
  if (trimmed.startsWith(bucketHost)) return { action: "skip_migrated" };
  return { action: "migrate" };
}

/** Storage object key within the bucket for a given recipe id. */
export function objectKeyFor(recipeId: string): string {
  return `${recipeId}.webp`;
}

/** Bytes saved by conversion, never negative. */
export function bytesSaved(beforeBytes: number, afterBytes: number): number {
  return Math.max(0, beforeBytes - afterBytes);
}
