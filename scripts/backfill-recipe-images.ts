/**
 * One-time backfill: migrate recipe.image_url from external URLs into WebP
 * objects in the `recipe-images` Supabase Storage bucket.
 *
 * Run (see package.json `backfill:recipe-images`, or directly):
 *   bun run scripts/backfill-recipe-images.ts --limit=3 --dry-run
 *   bun run scripts/backfill-recipe-images.ts --limit=3
 *   bun run scripts/backfill-recipe-images.ts
 *
 * Flags: --dry-run | --limit=N | --quality=N | --max-width=N | --concurrency=N
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Writes scripts/backfill-recipe-images.report.json (old->new map; for audit/rollback).
 * Exit code is non-zero if any row failed.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { Database } from "~/lib/supabase/supabase-types";
import { loadAdminClientFromEnv } from "./lib/supabase-admin";
import {
  parseArgs,
  getBucketPublicHost,
  decideMigration,
  targetKeyFor,
  objectPathFromUrl,
  bytesSaved,
} from "./lib/backfill-recipe-logic";
import type { MigrationAction } from "./lib/backfill-recipe-logic";

const BUCKET = "recipe-images";
const PAGE_SIZE = 1000;
const PROGRESS_EVERY = 50;
// Absolute (CWD-independent) report path. Equivalent to Bun's `import.meta.dir`
// but typechecks under @types/node (project tsconfig has no Bun types).
const REPORT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "backfill-recipe-images.report.json"
);

type RecipeRow = Database["public"]["Tables"]["recipe"]["Row"];
type ReportStatus = MigrationAction | "migrated" | "dry_run" | "failed";
interface ReportEntry {
  recipeId: string;
  old: string | null;
  new: string | null;
  bytesBefore: number;
  bytesAfter: number;
  status: ReportStatus;
  error?: string;
}

async function fetchAllRecipes(
  client: ReturnType<typeof loadAdminClientFromEnv>
): Promise<Pick<RecipeRow, "id" | "image_url">[]> {
  const out: Pick<RecipeRow, "id" | "image_url">[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("recipe")
      .select("id, image_url")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

async function downloadBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": "cookkit-backfill/1.0 (+https://github.com/ming/recipe-rn)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function convertToWebp(
  input: Uint8Array,
  quality: number,
  maxWidth: number | undefined
): Promise<Buffer> {
  let pipeline = sharp(input).webp({ quality });
  if (maxWidth !== undefined)
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  return pipeline.toBuffer();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number, result: R) => void
): Promise<R[]> {
  // Defense-in-depth: parseArgs already validates, but fail loudly if called directly.
  if (concurrency < 1) throw new Error(`concurrency must be >= 1, got ${concurrency}`);
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      const result = await fn(items[idx]!);
      results[idx] = result;
      completed++;
      if (onProgress) onProgress(completed, items.length, result);
    }
  });
  await Promise.all(workers);
  return results;
}

async function migrateRow(
  client: ReturnType<typeof loadAdminClientFromEnv>,
  row: Pick<RecipeRow, "id" | "image_url">,
  bucketHost: string,
  opts: ReturnType<typeof parseArgs>
): Promise<ReportEntry> {
  const decision = decideMigration(row.image_url, bucketHost);
  const base: ReportEntry = {
    recipeId: row.id,
    old: row.image_url,
    new: null,
    bytesBefore: 0,
    bytesAfter: 0,
    status: decision.action,
  };
  if (decision.action !== "migrate") return base;

  try {
    const before = await downloadBytes(row.image_url as string);
    const after = await convertToWebp(before, opts.quality, opts.maxWidth);

    if (opts.dryRun) {
      return { ...base, bytesBefore: before.byteLength, bytesAfter: after.byteLength, status: "dry_run" };
    }

    const newKey = targetKeyFor(row.image_url, bucketHost, row.id);
    const oldKey = objectPathFromUrl(row.image_url, bucketHost);

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(newKey, after, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { data } = client.storage.from(BUCKET).getPublicUrl(newKey);
    const newUrl = data.publicUrl;

    const { error: updateError } = await client
      .from("recipe")
      .update({ image_url: newUrl })
      .eq("id", row.id);
    if (updateError) throw updateError;

    // Delete the now-unreferenced old object so the bucket stays clean. Best-effort:
    // a failure leaves a harmless orphan (old extension), recorded in `error` for cleanup.
    let warning: string | undefined;
    if (oldKey && oldKey !== newKey) {
      const { error: deleteError } = await client.storage.from(BUCKET).remove([oldKey]);
      if (deleteError) warning = `orphan-left:${oldKey} (${deleteError.message})`;
    }

    return {
      ...base,
      new: newUrl,
      bytesBefore: before.byteLength,
      bytesAfter: after.byteLength,
      status: "migrated",
      ...(warning ? { error: warning } : {}),
    };
  } catch (err) {
    return { ...base, status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

function summarize(entries: ReportEntry[]): string {
  const count = (predicate: (e: ReportEntry) => boolean) => entries.filter(predicate).length;
  const failed = count((e) => e.status === "failed");
  const migrated = count((e) => e.status === "migrated");
  const dryRun = count((e) => e.status === "dry_run");
  const skipEmpty = count((e) => e.status === "skip_empty");
  const skipWebp = count((e) => e.status === "skip_webp");
  const totalBefore = entries.reduce((sum, e) => sum + e.bytesBefore, 0);
  const totalAfter = entries.reduce((sum, e) => sum + e.bytesAfter, 0);
  return [
    `migrated=${migrated} dry_run=${dryRun} skip_empty=${skipEmpty} skip_webp=${skipWebp} failed=${failed}`,
    `bytes: ${totalBefore} -> ${totalAfter} (saved ${bytesSaved(totalBefore, totalAfter)})`,
  ].join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const client = loadAdminClientFromEnv();
  const bucketHost = getBucketPublicHost(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "", BUCKET);

  console.log(`[backfill] dryRun=${opts.dryRun} limit=${opts.limit ?? "none"} concurrency=${opts.concurrency}`);
  const all = await fetchAllRecipes(client);
  const target = opts.limit ? all.slice(0, opts.limit) : all;
  console.log(`[backfill] recipes=${all.length} processing=${target.length}`);

  let migrated = 0;
  let failed = 0;
  const entries = await mapWithConcurrency(
    target,
    opts.concurrency,
    (row) => migrateRow(client, row, bucketHost, opts),
    (completed, total, entry) => {
      if (entry.status === "migrated" || entry.status === "dry_run") migrated++;
      else if (entry.status === "failed") failed++;
      if (completed % PROGRESS_EVERY === 0) {
        console.log(`[backfill] progress ${completed}/${total} migrated=${migrated} failed=${failed}`);
      }
    }
  );

  await writeFile(
    REPORT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), bucket: BUCKET, dryRun: opts.dryRun, entries }, null, 2)
  );

  console.log("[backfill] " + summarize(entries));
  console.log(`[backfill] report written to ${REPORT_PATH}`);

  const failedTotal = entries.filter((e) => e.status === "failed").length;
  process.exit(failedTotal > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
