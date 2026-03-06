-- 028_user_ratings.sql
-- Buyer ↔ Seller reviews after a completed order

CREATE TABLE IF NOT EXISTS public.user_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    reviewer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT CHECK (char_length(comment) <= 500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT one_review_per_order_per_reviewer UNIQUE (order_id, reviewer_id),
    CONSTRAINT reviewer_not_reviewee CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewee ON public.user_reviews(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reviews_order    ON public.user_reviews(order_id);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public trust signal)
DROP POLICY IF EXISTS "user_reviews_select" ON public.user_reviews;
CREATE POLICY "user_reviews_select" ON public.user_reviews
    FOR SELECT USING (true);

-- Only the reviewer themselves can insert, and only as themselves
DROP POLICY IF EXISTS "user_reviews_insert" ON public.user_reviews;
CREATE POLICY "user_reviews_insert" ON public.user_reviews
    FOR INSERT WITH CHECK (
        reviewer_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = user_reviews.order_id
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
              AND o.status IN ('completed', 'pin_verified')
        )
    );
