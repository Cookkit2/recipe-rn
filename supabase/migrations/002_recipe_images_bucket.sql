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
