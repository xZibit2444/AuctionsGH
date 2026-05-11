-- 20260505100000_open_auction_creation.sql
-- Allow all authenticated, non-banned users to create and update their own auctions.
-- Previously (016_admin_sellers.sql) insert/update were restricted to users with is_admin = true.

DROP POLICY IF EXISTS "Only admins can create auctions" ON public.auctions;
DROP POLICY IF EXISTS "Admins can update their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can create auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers can update own auctions" ON public.auctions;

CREATE POLICY "Authenticated users can create auctions"
  ON public.auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

CREATE POLICY "Sellers can update own auctions"
  ON public.auctions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = seller_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  )
  WITH CHECK (
    auth.uid() = seller_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );
