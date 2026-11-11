-- 20261111_revoke_orders_client_update.sql
-- Every legitimate orders write goes through the service-role client
-- (api/orders/route.ts, createOrder.ts, cancelOrder.ts) or security-definer
-- functions, which bypass RLS and have their own grants. The anon-key
-- table-level UPDATE grant plus the party-scoped UPDATE policy let a buyer
-- or seller PATCH ANY column on their order row via PostgREST - amount,
-- status, delivery fields, ... - bypassing all server-side validation.
REVOKE UPDATE ON TABLE public.orders FROM anon, authenticated;

-- The party-scoped UPDATE policy is now dead (no role it applies to holds
-- the UPDATE privilege). Drop it so the intent is unambiguous.
DROP POLICY IF EXISTS "Buyers and sellers can update their own orders" ON public.orders;
