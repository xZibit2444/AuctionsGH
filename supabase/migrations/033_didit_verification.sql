-- 032_didit_verification.sql
-- Add Didit.me identity verification fields to seller_applications

ALTER TABLE public.seller_applications
    ADD COLUMN IF NOT EXISTS didit_session_id TEXT,
    ADD COLUMN IF NOT EXISTS didit_verified   BOOLEAN NOT NULL DEFAULT FALSE;

-- Make id_type / id_number nullable (Didit captures the document itself)
ALTER TABLE public.seller_applications
    ALTER COLUMN id_type   DROP NOT NULL,
    ALTER COLUMN id_number DROP NOT NULL;
