-- Favorite sellers stored per account so they follow the user across devices
CREATE TABLE IF NOT EXISTS public.favorite_sellers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_sellers_user ON public.favorite_sellers(user_id);

ALTER TABLE public.favorite_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their favorite sellers" ON public.favorite_sellers;
CREATE POLICY "Users can view their favorite sellers"
  ON public.favorite_sellers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can favorite sellers" ON public.favorite_sellers;
CREATE POLICY "Users can favorite sellers"
  ON public.favorite_sellers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfavorite sellers" ON public.favorite_sellers;
CREATE POLICY "Users can unfavorite sellers"
  ON public.favorite_sellers FOR DELETE USING (auth.uid() = user_id);
