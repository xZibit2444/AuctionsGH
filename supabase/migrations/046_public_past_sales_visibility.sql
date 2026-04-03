-- Let users choose whether completed past sales/listing history appear on their public profile.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_past_sales BOOLEAN NOT NULL DEFAULT false;
