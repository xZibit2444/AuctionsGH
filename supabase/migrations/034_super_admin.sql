-- Add is_super_admin column — only the DB owner sets this manually
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Only super admins can update the seller_applications table via RLS
-- (the existing app uses service role key to bypass RLS, so this is belt-and-suspenders)
