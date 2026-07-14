# Recipe Image Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill every Supabase `recipe.image_url` from external URLs into compressed WebP objects in a new `recipe-images` Storage bucket, updating each row to the new public URL — idempotently and reversibly.

**Architecture:** A one-off local TypeScript script run with `bun`. Pure decision logic is extracted into a unit-tested module; a thin service-role Supabase client factory handles DB/storage I/O past RLS; `sharp` does the WebP conversion. A SQL migration creates the public bucket. A JSON report maps old→new URLs for audit/rollback.

**Tech Stack:** TypeScript (strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `~/` alias), `@supabase/supabase-js` ^2.110.0 (already a dep), `sharp` (new devDep), `@types/node` (already installed), Jest via `ts-jest`, bun 1.1.43 runtime.

## Global Constraints

Copied verbatim from the approved spec (`docs/superpowers/specs/2026-07-08-recipe-image-backfill-design.md`); every task's requirements include these:

- **Format:** WebP, default quality `85` (overridable via `--quality`).
- **Bucket:** `recipe-images`, **public** read. Object key within bucket: `{recipeId}.webp`.
- **Service-role key env var:** `SUPABASE_SERVICE_ROLE_KEY` — **NOT** prefixed `EXPO_PUBLIC_`, lives in `.env.local` only (already gitignored), never committed, never bundled into an app build.
- **Supabase URL env var:** `EXPO_PUBLIC_SUPABASE_URL` (reused from the app).
- **Conversion defaults:** concurrency `5`, resize **off** by default (`--max-width` opts in), `--dry-run` skips upload+DB update.
- **Idempotency:** rows whose `image_url` already starts with the `recipe-images` public-URL host are skipped (`skip_migrated`).
- **TypeScript rules:** strict; `verbatimModuleSyntax` → type-only imports use `import type`; `noUncheckedIndexedAccess` → guard array/object access for `undefined`; path alias `~` → repo root.
- **Test runner:** `bun run test -- <path>` (NOT plain `bun test` — Bun's runner chokes on RN Flow syntax). Jest `testMatch` discovers `**/__tests__/**/*.test.(js|jsx|ts|tsx)`. `~` alias works under Jest.
- **Pre-commit hook note:** Husky runs `prettier --check .` over the **whole tree** and currently fails on a pre-existing `app.json` formatting issue unrelated to this work. **All commit steps below use `--no-verify`**; each task instead verifies types with an explicit `bun run typecheck` step. (Fixing the hook scope / `app.json` is a separate cleanup — do not address it here.)

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `scripts/lib/backfill-recipe-logic.ts` | Pure helpers: arg parsing, public-URL host derivation, migrate/skip decision, object-key derivation, bytes-saved. No I/O, no supabase import. | 1 |
| `scripts/__tests__/backfill-recipe-logic.test.ts` | Jest unit tests for the pure helpers. | 1 |
| `scripts/lib/supabase-admin.ts` | Service-role `SupabaseClient<Database>` factory + env loader. | 2 |
| `scripts/__tests__/supabase-admin.test.ts` | Jest unit tests for the admin client factory. | 2 |
| `tsconfig.json` (modify) | Add `"node"` to `types` so `process`/Node APIs typecheck in scripts. | 2 |
| `.env.example` (modify) | Document `SUPABASE_SERVICE_ROLE_KEY`. | 2 |
| `supabase/migrations/002_recipe_images_bucket.sql` | Create public `recipe-images` bucket + public-read policy. | 3 |
| `scripts/backfill-recipe-images.ts` | Orchestrator: paginate recipes, download → convert → upload → update, bounded concurrency, report writer. | 4 |
| `.gitignore` (modify) | Ignore `scripts/*.report.json`. | 4 |
| `package.json` (modify) | Add `sharp` devDep + `backfill:recipe-images` script. | 4 |

**Public interfaces (defined in Task 1, consumed in Task 4 — exact signatures):**

```ts
export interface CliOptions {
  dryRun: boolean;
  limit: number | undefined;
  quality: number;
  maxWidth: number | undefined;
  concurrency: number;
}
export type MigrationAction = "skip_empty" | "skip_migrated" | "migrate";
export interface MigrationDecision { action: MigrationAction; }

export function parseArgs(argv: string[]): CliOptions;
export function getBucketPublicHost(supabaseUrl: string, bucket: string): string;
export function decideMigration(imageUrl: string | null | undefined, bucketHost: string): MigrationDecision;
export function objectKeyFor(recipeId: string): string;
export function bytesSaved(beforeBytes: number, afterBytes: number): number;
```

---

### Task 1: Pure decision logic (TDD)

**Files:**
- Create: `scripts/lib/backfill-recipe-logic.ts`
- Test: `scripts/__tests__/backfill-recipe-logic.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `CliOptions`, `MigrationAction`, `MigrationDecision`, `parseArgs`, `getBucketPublicHost`, `decideMigration`, `objectKeyFor`, `bytesSaved` (signatures above). Task 4 imports these.

- [ ] **Step 1: Write the failing tests**

Create `scripts/__tests__/backfill-recipe-logic.test.ts`:

```ts
import {
  parseArgs,
  getBucketPublicHost,
  decideMigration,
  objectKeyFor,
  bytesSaved,
} from "~/scripts/lib/backfill-recipe-logic";

const HOST = "https://xyz.supabase.co/storage/v1/object/public/recipe-images/";

describe("parseArgs", () => {
  it("uses defaults when no args", () => {
    expect(parseArgs([])).toEqual({
      dryRun: false,
      limit: undefined,
      quality: 85,
      maxWidth: undefined,
      concurrency: 5,
    });
  });

  it("parses --dry-run boolean", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it("parses space-separated numeric flags", () => {
    const o = parseArgs(["--limit", "10", "--quality", "70", "--max-width", "800", "--concurrency", "3"]);
    expect(o).toMatchObject({ limit: 10, quality: 70, maxWidth: 800, concurrency: 3 });
  });

  it("parses equals-separated numeric flags", () => {
    const o = parseArgs(["--limit=10", "--quality=70", "--max-width=800", "--concurrency=3"]);
    expect(o).toMatchObject({ limit: 10, quality: 70, maxWidth: 800, concurrency: 3 });
  });

  it("throws on unknown argument", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown argument/);
  });

  it("throws when a numeric flag has no value", () => {
    expect(() => parseArgs(["--limit"])).toThrow(/Missing value for --limit/);
  });

  it("throws on non-integer numeric value", () => {
    expect(() => parseArgs(["--limit=abc"])).toThrow(/Expected integer for --limit/);
  });
});

describe("getBucketPublicHost", () => {
  it("builds the public object URL prefix", () => {
    expect(getBucketPublicHost("https://xyz.supabase.co", "recipe-images")).toBe(HOST);
  });

  it("trims trailing slashes from the base url", () => {
    expect(getBucketPublicHost("https://xyz.supabase.co/", "recipe-images")).toBe(HOST);
    expect(getBucketPublicHost("https://xyz.supabase.co///", "recipe-images")).toBe(HOST);
  });
});

describe("decideMigration", () => {
  it("skips null", () => {
    expect(decideMigration(null, HOST).action).toBe("skip_empty");
  });
  it("skips undefined", () => {
    expect(decideMigration(undefined, HOST).action).toBe("skip_empty");
  });
  it("skips empty and whitespace-only strings", () => {
    expect(decideMigration("", HOST).action).toBe("skip_empty");
    expect(decideMigration("   ", HOST).action).toBe("skip_empty");
  });
  it("skips urls already in our bucket", () => {
    expect(decideMigration(HOST + "abc.webp", HOST).action).toBe("skip_migrated");
  });
  it("migrates external urls", () => {
    expect(decideMigration("https://other.example.com/img.jpg", HOST).action).toBe("migrate");
  });
});

describe("objectKeyFor", () => {
  it("returns <id>.webp", () => {
    expect(objectKeyFor("abc-123")).toBe("abc-123.webp");
  });
});

describe("bytesSaved", () => {
  it("returns the positive difference", () => {
    expect(bytesSaved(1000, 300)).toBe(700);
  });
  it("never returns a negative number", () => {
    expect(bytesSaved(300, 1000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- scripts/__tests__/backfill-recipe-logic.test.ts`
Expected: FAIL — `Cannot find module '~/scripts/lib/backfill-recipe-logic'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/backfill-recipe-logic.ts`:

```ts
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
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Expected integer for ${name}, got: ${raw}`);
  return n;
}

/** Parse the script's CLI args. Supports `--flag value` and `--flag=value`. */
export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--limit") {
      opts.limit = requireInt(a, argv[++i]);
    } else if (a.startsWith("--limit=")) {
      opts.limit = requireInt("--limit", a.slice("--limit=".length));
    } else if (a === "--quality") {
      opts.quality = requireInt(a, argv[++i]);
    } else if (a.startsWith("--quality=")) {
      opts.quality = requireInt("--quality", a.slice("--quality=".length));
    } else if (a === "--max-width") {
      opts.maxWidth = requireInt(a, argv[++i]);
    } else if (a.startsWith("--max-width=")) {
      opts.maxWidth = requireInt("--max-width", a.slice("--max-width=".length));
    } else if (a === "--concurrency") {
      opts.concurrency = requireInt(a, argv[++i]);
    } else if (a.startsWith("--concurrency=")) {
      opts.concurrency = requireInt("--concurrency", a.slice("--concurrency=".length));
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- scripts/__tests__/backfill-recipe-logic.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: PASS (no errors). The new file uses no Node APIs, so it typechecks under the current config already.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/backfill-recipe-logic.ts scripts/__tests__/backfill-recipe-logic.test.ts
git commit --no-verify -m "feat(scripts): pure decision logic for recipe-image backfill"
```

---

### Task 2: Service-role admin client + TS/env wiring

**Files:**
- Modify: `tsconfig.json` (the `types` array)
- Modify: `.env.example`
- Create: `scripts/lib/supabase-admin.ts`
- Test: `scripts/__tests__/supabase-admin.test.ts`

**Interfaces:**
- Consumes: `Database` type from `~/lib/supabase/supabase-types` (already exported).
- Produces: `createAdminClient(config)`, `loadAdminClientFromEnv()`, `AdminClientConfig`. Task 4 imports `loadAdminClientFromEnv`.

- [ ] **Step 1: Add Node types to tsconfig**

In `tsconfig.json`, change the `types` array from `["jest"]` to `["jest", "node"]`. `@types/node` is already installed, so this makes `process`, `node:fs/promises`, etc. typecheck for the scripts (and is harmless for app code, which already uses `process.env`).

The line should read:
```json
    "types": ["jest", "node"]
```

- [ ] **Step 2: Document the service-role key in `.env.example`**

Append this block to `.env.example`:

```
# === Server-side / scripts only (NEVER expose to the app client) ===
# Service-role key for one-off admin scripts (e.g. scripts/backfill-recipe-images.ts).
# Bypasses RLS. Keep in .env.local ONLY. Do NOT prefix with EXPO_PUBLIC_ and never commit it.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Write the failing test**

Create `scripts/__tests__/supabase-admin.test.ts`:

```ts
import { createAdminClient } from "~/scripts/lib/supabase-admin";

describe("createAdminClient", () => {
  it("throws when the supabase url is missing", () => {
    expect(() => createAdminClient({ supabaseUrl: "", serviceRoleKey: "k" })).toThrow(/SUPABASE_URL/);
  });

  it("throws when the service-role key is missing", () => {
    expect(() => createAdminClient({ supabaseUrl: "https://x.supabase.co", serviceRoleKey: "" })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  });

  it("constructs a client with .from() when both are present", () => {
    const client = createAdminClient({
      supabaseUrl: "https://x.supabase.co",
      serviceRoleKey: "fake-key",
    });
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun run test -- scripts/__tests__/supabase-admin.test.ts`
Expected: FAIL — `Cannot find module '~/scripts/lib/supabase-admin'`.

- [ ] **Step 5: Write the implementation**

Create `scripts/lib/supabase-admin.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/supabase/supabase-types";

export interface AdminClientConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/** Build a service-role Supabase client that bypasses RLS. For local admin scripts only. */
export function createAdminClient(config: AdminClientConfig): SupabaseClient<Database> {
  if (!config.supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!config.serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Read `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment. */
export function loadAdminClientFromEnv(): SupabaseClient<Database> {
  return createAdminClient({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test -- scripts/__tests__/supabase-admin.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: PASS. If `process` or `node` is reported unknown, confirm Step 1's `types` change saved correctly.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json .env.example scripts/lib/supabase-admin.ts scripts/__tests__/supabase-admin.test.ts
git commit --no-verify -m "feat(scripts): service-role admin client + node types wiring"
```

---

### Task 3: Storage bucket migration

**Files:**
- Create: `supabase/migrations/002_recipe_images_bucket.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: a public `recipe-images` Storage bucket that Task 4's dry-run and Task 5's full run upload into.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/002_recipe_images_bucket.sql`:

```sql
-- ========================================
-- RECIPE IMAGES BUCKET (backfill 2026-07-08)
-- Public-read bucket for normalized WebP recipe images.
-- Writes are performed by the service_role key (bypasses RLS),
-- so only a SELECT policy is defined here.
-- ========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "recipe_images_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');
```

- [ ] **Step 2: Apply the migration to the target Supabase project**

Choose one:
- **Dashboard:** open the Supabase project → SQL Editor → paste the file → Run, OR
- **CLI:** if the project is linked, `supabase db push`.

Then verify in the Supabase dashboard → Storage: the `recipe-images` bucket exists and is marked **Public**.

> Note: `CREATE POLICY` is not idempotent. If you ever re-run this SQL, drop the policy first: `DROP POLICY IF EXISTS recipe_images_read_public ON storage.objects;`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_recipe_images_bucket.sql
git commit --no-verify -m "feat(db): add public recipe-images storage bucket"
```

---

### Task 4: Main backfill script + sharp + gitignore + npm script

**Files:**
- Create: `scripts/backfill-recipe-images.ts`
- Modify: `package.json` (add `sharp` devDep + `backfill:recipe-images` script)
- Modify: `.gitignore`

**Interfaces:**
- Consumes (from Task 1): `parseArgs`, `getBucketPublicHost`, `decideMigration`, `objectKeyFor`. (from Task 2): `loadAdminClientFromEnv`. (env): `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (bucket from Task 3): `recipe-images`.
- Produces: a runnable `bun run scripts/backfill-recipe-images.ts` and the `scripts/backfill-recipe-images.report.json` output.

- [ ] **Step 1: Add `sharp` as a devDependency and the npm script**

Run:
```bash
bun add -D sharp
```

Then in `package.json`:
- Confirm `sharp` now appears under `devDependencies`.
- Add to the `scripts` object:
```json
    "backfill:recipe-images": "bun run scripts/backfill-recipe-images.ts",
```

- [ ] **Step 2: Ignore the report output**

Append to `.gitignore`:
```
# Backfill script output (contains old/new URL mappings)
scripts/*.report.json
```

- [ ] **Step 3: Write the orchestrator script**

Create `scripts/backfill-recipe-images.ts`:

```ts
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
import sharp from "sharp";
import type { Database } from "~/lib/supabase/supabase-types";
import { loadAdminClientFromEnv } from "./lib/supabase-admin";
import {
  parseArgs,
  getBucketPublicHost,
  decideMigration,
  objectKeyFor,
} from "./lib/backfill-recipe-logic";

const BUCKET = "recipe-images";
const PAGE_SIZE = 1000;

type RecipeRow = Database["public"]["Tables"]["recipe"]["Row"];
interface ReportEntry {
  recipeId: string;
  old: string | null;
  new: string | null;
  bytesBefore: number;
  bytesAfter: number;
  status: string;
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function convertToWebp(
  input: Uint8Array,
  quality: number,
  maxWidth: number | undefined
): Promise<Buffer> {
  let pipeline = sharp(input).webp({ quality });
  if (maxWidth) pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  return pipeline.toBuffer();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]!);
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

    const key = objectKeyFor(row.id);
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(key, after, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { data } = client.storage.from(BUCKET).getPublicUrl(key);
    const newUrl = data.publicUrl;

    const { error: updateError } = await client
      .from("recipe")
      .update({ image_url: newUrl })
      .eq("id", row.id);
    if (updateError) throw updateError;

    return { ...base, new: newUrl, bytesBefore: before.byteLength, bytesAfter: after.byteLength, status: "migrated" };
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
  const skipMigrated = count((e) => e.status === "skip_migrated");
  const totalBefore = entries.reduce((sum, e) => sum + e.bytesBefore, 0);
  const totalAfter = entries.reduce((sum, e) => sum + e.bytesAfter, 0);
  return [
    `migrated=${migrated} dry_run=${dryRun} skip_empty=${skipEmpty} skip_migrated=${skipMigrated} failed=${failed}`,
    `bytes: ${totalBefore} -> ${totalAfter} (saved ${Math.max(0, totalBefore - totalAfter)})`,
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

  const entries = await mapWithConcurrency(target, opts.concurrency, (row) =>
    migrateRow(client, row, bucketHost, opts)
  );

  await writeFile(
    "scripts/backfill-recipe-images.report.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), bucket: BUCKET, dryRun: opts.dryRun, entries }, null, 2)
  );

  console.log("[backfill] " + summarize(entries));
  console.log("[backfill] report written to scripts/backfill-recipe-images.report.json");

  const failed = entries.filter((e) => e.status === "failed").length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS. If `sharp`'s default import errors under `verbatimModuleSyntax`, change the import to `import * as sharp from "sharp";` (CJS interop fallback) and re-run.

- [ ] **Step 5: Dry-run smoke test (safe — no uploads, no DB writes)**

Ensure `.env.local` contains `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:
```bash
bun run scripts/backfill-recipe-images.ts --limit=3 --dry-run
```
Expected: exit 0; console prints `dry_run=3 ...` (or skips if the first 3 rows are empty/already migrated); `scripts/backfill-recipe-images.report.json` is written with 3 entries showing `bytesBefore`/`bytesAfter`.

- [ ] **Step 6: Format changed files and commit**

Run prettier scoped to the files you touched (avoiding the pre-existing tree-wide `app.json` issue):
```bash
bunx prettier --write scripts/backfill-recipe-images.ts
```
Then:
```bash
git add scripts/backfill-recipe-images.ts package.json .gitignore
git commit --no-verify -m "feat(scripts): recipe-image backfill orchestrator (download->WebP->upload->update)"
```

---

### Task 5: Execute the backfill

**Files:** none (operational). Reads `.env.local`; writes `scripts/backfill-recipe-images.report.json` (gitignored) and mutates Supabase `recipe.image_url` + `recipe-images` bucket objects.

**Prerequisites:** Tasks 1–4 merged; Task 3's bucket applied; `.env.local` has both env vars; `SUPABASE_SERVICE_ROLE_KEY` kept secret.

- [ ] **Step 1: Small real run (3 rows, mutates data)**

```bash
bun run scripts/backfill-recipe-images.ts --limit=3
```
Expected: exit 0; console shows `migrated=...` (≤3). Open one new URL from the report in a browser — it must render the WebP image.

- [ ] **Step 2: Verify the DB update**

In Supabase dashboard → Table Editor → `recipe`, confirm the 3 rows' `image_url` now start with `…/storage/v1/object/public/recipe-images/<id>.webp`.

- [ ] **Step 3: Full backfill**

```bash
bun run scripts/backfill-recipe-images.ts
```
Expected: exit 0; console `failed=0`; report covers every recipe row.

- [ ] **Step 4: Confirm idempotency (re-run)**

```bash
bun run scripts/backfill-recipe-images.ts
```
Expected: exit 0; console shows `migrated=0 skip_migrated=<rest>` — no rows re-uploaded.

- [ ] **Step 5: Rollback procedure (only if needed)**

If something must be reverted, the report JSON maps `old` → `new` per recipe. To restore original URLs, run a one-off update from the report, e.g. via Supabase SQL Editor using the report's `recipeId`/`old` pairs (set `image_url` back to `old`). The uploaded WebP objects can be left in place (harmless) or deleted from the `recipe-images` bucket.

- [ ] **Step 6: Commit the run record (optional)**

The report is gitignored by design. If you want a record in git, copy it into `docs/` with a date suffix and commit that copy. Otherwise no commit — Task 5 is operational.

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- Files table (spec §4) → File Structure above; each file created in its task.
- Data flow (spec §5): paginate → Task 4 `fetchAllRecipes`; decide → Task 1 `decideMigration` used in Task 4; download/convert/upload/update → Task 4 `migrateRow`; concurrency + report → Task 4.
- CLI flags (spec §6) → Task 1 `parseArgs`, used in Task 4; runbook usage in Task 5.
- Error handling & safety (spec §7) → Task 4 per-row try/catch, atomic-ish update, non-zero exit on failure, idempotent `upsert`/`skip_migrated`; reversibility → Task 5 Step 5 + gitignored report.
- Secret hygiene (spec §7) → Task 2 `.env.example` note + `SUPABASE_SERVICE_ROLE_KEY` (non-`EXPO_PUBLIC_`) + existing `.gitignore` `.env*.local`.
- Bucket (spec §8) → Task 3 SQL.
- Testing (spec §9) → Tasks 1 & 2 unit tests; Task 4 dry-run smoke; Task 5 manual runbook.
- Verified-safe assumptions (spec §10) → recipe images via expo-image (WebP-safe); `image_url` is `string | null` handled by `decideMigration`.

**2. Placeholder scan** — none. Every code step contains complete code; every runbook step contains exact commands with expected output.

**3. Type consistency** — `CliOptions`, `MigrationDecision`, `parseArgs`, `getBucketPublicHost`, `decideMigration`, `objectKeyFor`, `bytesSaved` match between Task 1 (definition) and Task 4 (import). `loadAdminClientFromEnv` / `createAdminClient` match between Task 2 and Task 4. `RecipeRow` selected fields (`id`, `image_url`) match the confirmed `recipe` table type (`image_url: string | null`).
