-- 004_saved_auctions.sql
-- Allows users to save/like auctions

CREATE TABLE public.saved_auctions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id  UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, auction_id)
);

-- Index for fast lookups per user
CREATE INDEX idx_saved_auctions_user ON public.saved_auctions(user_id);

-- RLS
ALTER TABLE public.saved_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved auctions"
  ON public.saved_auctions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save auctions"
  ON public.saved_auctions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave auctions"
  ON public.saved_auctions FOR DELETE
  USING (auth.uid() = user_id);
