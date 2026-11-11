-- 20261111_revoke_auctions_client_insert.sql
-- Phone numbers are mandatory on every account. Listing creation moved to the
-- createListingAction server action (service role), which enforces auth, the
-- phone requirement and full validation. Every legitimate auctions INSERT goes
-- through the service-role client (createListingAction, relistAuctionAction);
-- no browser code inserts auctions any more. The anon-key table-level INSERT
-- grant let any authenticated session POST a crafted row to PostgREST,
-- skipping the phone check and all server-side validation.
--
-- service_role keeps its own privileges, so server actions and
-- security-definer functions are unaffected. Reads are untouched.
REVOKE INSERT ON TABLE public.auctions FROM anon, authenticated;

-- The authenticated INSERT policy is now dead (no role it applies to holds
-- the INSERT privilege). Drop it so the intent is unambiguous.
DROP POLICY IF EXISTS "Authenticated users can create auctions" ON public.auctions;

-- Rollback, if ever needed:
--   GRANT INSERT ON TABLE public.auctions TO authenticated;
--   CREATE POLICY "Authenticated users can create auctions"
--     ON public.auctions FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = seller_id AND NOT EXISTS (
--       SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned = true));
