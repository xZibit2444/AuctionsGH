-- 20261111_drop_permissive_insert_policies.sql
-- Orders and deliveries are only ever inserted through the service-role
-- client (api/orders, createOrder, api/delivery/create) or security-definer
-- functions (place_bid), all of which bypass RLS. These two permissive
-- INSERT policies (WITH CHECK true) let any user, including anonymous,
-- create fake orders naming arbitrary buyers/sellers/amounts, or fake
-- deliveries on any order. No legitimate user-context flow uses them.
DROP POLICY IF EXISTS "System can create orders" ON public.orders;
DROP POLICY IF EXISTS system_insert_deliveries ON public.deliveries;
