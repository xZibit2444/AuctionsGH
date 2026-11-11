-- Pinned listing flag: a pinned listing always shows first on the homepage
-- (Jason's collateral-loan listing is the first use; rest of the grid keeps
-- rotating). Defaults false so no existing listing is pinned.
ALTER TABLE public.auctions
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
