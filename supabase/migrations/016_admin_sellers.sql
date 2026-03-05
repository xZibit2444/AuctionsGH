-- 016_admin_sellers.sql

-- 1. Add is_admin to profiles
ALTER TABLE public.profiles
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- 2. Restrict INSERT on auctions to admins only
-- Note: existing policy might be "Sellers can create auctions"
-- Let's drop existing insert policy and create a new one.
DROP POLICY IF EXISTS "Sellers can create auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can create auctions" ON public.auctions;

CREATE POLICY "Only admins can create auctions" 
  ON public.auctions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = seller_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Restrict UPDATE on auctions to admins only (just in case)
DROP POLICY IF EXISTS "Sellers can update their own auctions" ON public.auctions;
CREATE POLICY "Admins can update their own auctions"
  ON public.auctions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = seller_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. Enable realtime for notifications table
-- The supabase_realtime publication is created by Supabase.
-- We must add our table to it.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
