# Recipe Image Backfill — External URLs → Supabase Storage WebP

- **Date:** 2026-07-08
- **Type:** One-time data migration (backfill script)
- **Status:** Approved (design)

## 1. Problem

`recipe.image_url` (Supabase `recipe` table, type `string | null`) currently holds **external URLs** — e.g. scraped/source CDNs. External URLs are unreliable (hotlink protection, link rot, varying formats and sizes) and we don't control their payload. The recent commit `944fa763` converted local bundled assets to WebP (-93%); this spec applies the same treatment to recipe images stored in Supabase.

## 2. Goal

One-time backfill: for every row in `recipe`, download `image_url`, convert to compressed **WebP (q85)**, upload to a new Supabase Storage bucket `recipe-images`, and update `recipe.image_url` to the new public URL. Idempotent, reversible, re-runnable.

**Out of scope:** review photos (`review_photo.photo_url` — already JPEG in the `review-photos` bucket), local bundled assets (`assets/images/*`), and fixing the recipe-ingestion pipeline (no fix-at-source; backfill only).

## 3. Approach

Local Node/TypeScript script run once with `bun`. Uses the Supabase JS client with the **service-role key** (required to read all recipes, write to storage, and update every row past RLS) and `sharp` for conversion. Chosen over an Edge Function (CPU/wall-time limits, no `sharp` in Deno) and an in-app admin op (runs on a phone, RN can't do server-grade conversion, RLS blocks reading all rows).

## 4. Files

| File | Purpose |
|---|---|
| `scripts/backfill-recipe-images.ts` | Main script. Run: `bun run scripts/backfill-recipe-images.ts` |
| `scripts/lib/supabase-admin.ts` | Service-role client factory (reused by future scripts). Reads `EXPO_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from local env |
| `supabase/migrations/002_recipe_images_bucket.sql` | Creates public `recipe-images` bucket + public-read policy (matches `001` migration pattern) |
| `.env.example` | Documents new `SUPABASE_SERVICE_ROLE_KEY=` line — **not** `EXPO_PUBLIC_`, marked secret/local-only |
| `scripts/__tests__/backfill-recipe-images.test.ts` | Jest tests for pure decision/key logic |
| `scripts/backfill-recipe-images.report.json` | Output report (added to `.gitignore`) |

**Dependencies:** add `sharp` to `devDependencies`. `@supabase/supabase-js` (^2.110.0) is already a dependency.

**package.json script:** `"backfill:recipe-images": "bun run scripts/backfill-recipe-images.ts"`.

## 5. Data Flow (per recipe)

1. Page through `recipe` selecting `id, image_url` using `.range(from, to)` in a loop with a fixed page size (e.g. 1000) until a page returns fewer rows than the page size — avoids Supabase's default row cap on a single select.
2. **Decision** (pure function, unit-tested):
   - `image_url` is null/empty → `skip_empty`
   - `image_url` host already equals the `recipe-images` bucket public host → `skip_migrated`
   - otherwise → migrate
3. `fetch()` the bytes. On failure → `failed_download`, leave the row untouched, continue.
4. `sharp(buf).webp({ quality })`. Optional `.resize({ width: maxWidth, withoutEnlargement: true })` (off by default).
5. Upload to `recipe-images/{id}.webp` (keyed by recipe id → idempotent), `upsert: true`, `contentType: "image/webp"`.
6. Build the public URL via `storage.from("recipe-images").getPublicUrl(path)`; update `recipe` set `image_url` where `id`.
7. Record `{ recipeId, old, new, bytesBefore, bytesAfter, status }`.
8. Bounded-concurrency pool (default 5). On completion, write the report JSON and print a summary: migrated / skipped (by reason) / failed, and total bytes saved.

## 6. CLI Flags

| Flag | Default | Effect |
|---|---|---|
| `--dry-run` | off | Download + convert + measure size, but skip storage upload and DB update |
| `--limit=N` | none | Process only the first N eligible rows (testing) |
| `--quality=N` | `85` | WebP quality |
| `--max-width=N` | off | Resize cap (px), `withoutEnlargement`. Off by default so content is not altered unless opted in |
| `--concurrency=N` | `5` | Parallel workers |

## 7. Error Handling & Safety

- **Per-row try/catch:** every failure is recorded in the report with a reason; the batch never aborts.
- **Atomic-ish row update:** a row's `image_url` is only mutated *after* its upload succeeds; download/conversion failure leaves the old URL intact.
- **Orphaned storage object** on a failed DB update is harmless (idempotent key, overwritten on re-run).
- **Exit code:** `0` when there are zero `failed_*`; non-zero otherwise (so a bad run is obvious).
- **Reversibility:** the report JSON holds `old → new` for every changed row; a small rollback reads it and writes old URLs back.
- **Secret hygiene:** `SUPABASE_SERVICE_ROLE_KEY` lives only in `.env.local` (gitignored), never prefixed `EXPO_PUBLIC_`, never committed, never bundled into an app build.

## 8. Storage Bucket

New **public** bucket `recipe-images`, created via SQL migration `002_recipe_images_bucket.sql`:

```sql
insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Public read (recipe images are already served publicly today via the anon key)
create policy "recipe_images_read_public"
  on storage.objects for select
  using (bucket_id = 'recipe-images');
```

Write is performed by the service-role key, which bypasses RLS, so no insert policy is required for the backfill.

## 9. Testing

- **Unit (Jest):** pure pieces — the migrate/skip decision function, bucket-host detection, storage-key derivation, byte-savings calc.
- **Manual runbook:**
  1. `bun run scripts/backfill-recipe-images.ts --limit=3 --dry-run` → inspect report.
  2. `bun run scripts/backfill-recipe-images.ts --limit=3` → verify new URLs + image render in DB/app.
  3. Full run: `bun run scripts/backfill-recipe-images.ts`.
  4. Confirm exit code 0 and re-run shows all `skip_migrated`.

## 10. Verified-Safe Assumptions

- Recipe images display via `expo-image` (format-agnostic, decodes WebP natively) — no `.jpg` assumption exists anywhere in the recipe display path. (The `.jpg` hardcoding in `ReviewApi.ts` is a different table.) Changing extension/format is safe.
- `recipe.image_url` is `string | null` (confirmed in `lib/supabase/supabase-types.ts`) — null handling is required and included.
