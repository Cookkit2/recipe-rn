-- ========================================
-- FEATURE FLAGS
-- ========================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the ratings_and_reviews flag (off by default)
INSERT INTO public.feature_flags (key, enabled) VALUES ('ratings_and_reviews', false);

-- RLS: anyone can read, only service_role can write
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_select_public" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "feature_flags_insert_service" ON public.feature_flags FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "feature_flags_update_service" ON public.feature_flags FOR UPDATE USING (auth.role() = 'service_role');

-- ========================================
-- RECIPE REVIEWS
-- ========================================
CREATE TABLE IF NOT EXISTS public.recipe_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_review_recipe_id ON public.recipe_review (recipe_id);
CREATE INDEX idx_recipe_review_user_id ON public.recipe_review (user_id);
CREATE UNIQUE INDEX idx_recipe_review_unique ON public.recipe_review (recipe_id, user_id);

ALTER TABLE public.recipe_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_review_select_public" ON public.recipe_review FOR SELECT USING (true);
CREATE POLICY "recipe_review_insert_own" ON public.recipe_review FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_review_update_own" ON public.recipe_review FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipe_review_delete_own" ON public.recipe_review FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- REVIEW PHOTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.review_photo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.recipe_review(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position SMALLINT NOT NULL CHECK (position >= 1 AND position <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_photo_review_id ON public.review_photo (review_id);
CREATE UNIQUE INDEX idx_review_photo_position ON public.review_photo (review_id, position);

ALTER TABLE public.review_photo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_photo_select_public" ON public.review_photo FOR SELECT USING (true);
CREATE POLICY "review_photo_insert_own" ON public.review_photo FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipe_review WHERE recipe_review.id = review_photo.review_id AND recipe_review.user_id = auth.uid())
);
CREATE POLICY "review_photo_delete_own" ON public.review_photo FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipe_review WHERE recipe_review.id = review_photo.review_id AND recipe_review.user_id = auth.uid())
);

-- ========================================
-- REVIEW HELPFUL VOTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.review_helpful_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.recipe_review(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_helpful_vote_review_id ON public.review_helpful_vote (review_id);
CREATE INDEX idx_review_helpful_vote_user_id ON public.review_helpful_vote (user_id);
CREATE UNIQUE INDEX idx_review_helpful_vote_unique ON public.review_helpful_vote (review_id, user_id);

ALTER TABLE public.review_helpful_vote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_helpful_vote_select_public" ON public.review_helpful_vote FOR SELECT USING (true);
CREATE POLICY "review_helpful_vote_insert_own" ON public.review_helpful_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_helpful_vote_delete_own" ON public.review_helpful_vote FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- RECIPE TIPS
-- ========================================
CREATE TABLE IF NOT EXISTS public.recipe_tip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_tip_recipe_id ON public.recipe_tip (recipe_id);
CREATE INDEX idx_recipe_tip_user_id ON public.recipe_tip (user_id);

ALTER TABLE public.recipe_tip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_tip_select_public" ON public.recipe_tip FOR SELECT USING (true);
CREATE POLICY "recipe_tip_insert_own" ON public.recipe_tip FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_tip_update_own" ON public.recipe_tip FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipe_tip_delete_own" ON public.recipe_tip FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TIP HELPFUL VOTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.tip_helpful_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES public.recipe_tip(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tip_helpful_vote_tip_id ON public.tip_helpful_vote (tip_id);
CREATE INDEX idx_tip_helpful_vote_user_id ON public.tip_helpful_vote (user_id);
CREATE UNIQUE INDEX idx_tip_helpful_vote_unique ON public.tip_helpful_vote (tip_id, user_id);

ALTER TABLE public.tip_helpful_vote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tip_helpful_vote_select_public" ON public.tip_helpful_vote FOR SELECT USING (true);
CREATE POLICY "tip_helpful_vote_insert_own" ON public.tip_helpful_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tip_helpful_vote_delete_own" ON public.tip_helpful_vote FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- DENORMALIZED RECIPE COLUMNS
-- ========================================
ALTER TABLE public.recipe ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1);
ALTER TABLE public.recipe ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;

-- ========================================
-- STORAGE BUCKET
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "review_photos_upload_own" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "review_photos_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at on recipe_review
CREATE OR REPLACE FUNCTION public.update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_review_updated_at
  BEFORE UPDATE ON public.recipe_review
  FOR EACH ROW EXECUTE FUNCTION public.update_review_updated_at();

-- Auto-update updated_at on recipe_tip
CREATE OR REPLACE FUNCTION public.update_tip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_tip_updated_at
  BEFORE UPDATE ON public.recipe_tip
  FOR EACH ROW EXECUTE FUNCTION public.update_tip_updated_at();

-- Recalculate review helpful_count on vote change
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.recipe_review
  SET helpful_count = (SELECT COUNT(*) FROM public.review_helpful_vote WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_review_helpful_count
  AFTER INSERT OR DELETE ON public.review_helpful_vote
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();

-- Recalculate tip helpful_count on vote change
CREATE OR REPLACE FUNCTION public.update_tip_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.recipe_tip
  SET helpful_count = (SELECT COUNT(*) FROM public.tip_helpful_vote WHERE tip_id = COALESCE(NEW.tip_id, OLD.tip_id))
  WHERE id = COALESCE(NEW.tip_id, OLD.tip_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_tip_helpful_count
  AFTER INSERT OR DELETE ON public.tip_helpful_vote
  FOR EACH ROW EXECUTE FUNCTION public.update_tip_helpful_count();

-- Recalculate recipe avg_rating and review_count on review change
CREATE OR REPLACE FUNCTION public.update_recipe_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_recipe_id UUID;
BEGIN
  target_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
  UPDATE public.recipe
  SET
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.recipe_review WHERE recipe_id = target_recipe_id),
    review_count = (SELECT COUNT(*) FROM public.recipe_review WHERE recipe_id = target_recipe_id)
  WHERE id = target_recipe_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_recipe_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_review
  FOR EACH ROW EXECUTE FUNCTION public.update_recipe_rating_stats();