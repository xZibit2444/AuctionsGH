-- Offer chat threads are per (auction, buyer). Tag new-message notifications
-- for offer threads with the buyer side of the thread so read-marking and the
-- unread-messages popup can tell one buyer's thread from another's on the
-- same listing. Nullable: legacy rows stay NULL and are intentionally never
-- cleared by thread-level read-marking (they can't be attributed safely).
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS offer_buyer_id uuid;
