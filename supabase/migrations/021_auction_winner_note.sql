-- 021_auction_winner_note.sql
-- Seller-provided private note visible only to winner after auction is won.

CREATE TABLE IF NOT EXISTS public.auction_winner_notes (
  auction_id   UUID PRIMARY KEY REFERENCES public.auctions(id) ON DELETE CASCADE,
  seller_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT auction_winner_notes_note_len CHECK (char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_auction_winner_notes_seller_id ON public.auction_winner_notes(seller_id);

ALTER TABLE public.auction_winner_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can insert own winner notes" ON public.auction_winner_notes;
CREATE POLICY "Sellers can insert own winner notes"
  ON public.auction_winner_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1
      FROM public.auctions a
      WHERE a.id = auction_id
        AND a.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can update own winner notes" ON public.auction_winner_notes;
CREATE POLICY "Sellers can update own winner notes"
  ON public.auction_winner_notes
  FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Only auction winner can view note" ON public.auction_winner_notes;
CREATE POLICY "Only auction winner can view note"
  ON public.auction_winner_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.auctions a
      WHERE a.id = auction_id
        AND a.winner_id = auth.uid()
    )
  );
