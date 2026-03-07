-- 031_seller_applications.sql
-- Seller application flow: users apply to become sellers; admins approve/reject

CREATE TYPE seller_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.seller_applications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Snapshot of contact details at time of application
    full_name     TEXT NOT NULL,
    phone_number  TEXT NOT NULL,
    location      TEXT NOT NULL,

    -- Application content
    items_to_sell TEXT NOT NULL,
    experience    TEXT NOT NULL,
    id_type       TEXT NOT NULL,
    id_number     TEXT NOT NULL,

    -- Review
    status        seller_application_status NOT NULL DEFAULT 'pending',
    admin_notes   TEXT,
    reviewed_by   UUID REFERENCES public.profiles(id),
    reviewed_at   TIMESTAMPTZ,

    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One pending application per user at a time
CREATE UNIQUE INDEX seller_applications_user_pending_idx
    ON public.seller_applications(user_id)
    WHERE status = 'pending';

-- RLS
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

-- Users can see their own applications
CREATE POLICY "Users can view own applications"
    ON public.seller_applications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can submit an application
CREATE POLICY "Users can submit application"
    ON public.seller_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins can manage all applications"
    ON public.seller_applications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
