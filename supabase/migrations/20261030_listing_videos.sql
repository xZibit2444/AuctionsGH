-- 20261030_listing_videos.sql
-- Optional one-per-listing video in a private bucket, validated server-side before it is served.
-- Applied to production via the Supabase SQL editor on 2026-10-30.

CREATE TABLE IF NOT EXISTS public.listing_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id       UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  seller_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path     TEXT NOT NULL,
  content_type     TEXT NOT NULL,
  size_bytes       BIGINT NOT NULL,
  duration_seconds NUMERIC(6,1),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS listing_videos_one_per_auction ON public.listing_videos (auction_id);

ALTER TABLE public.listing_videos ENABLE ROW LEVEL SECURITY;

-- The seller can always read their own row; everyone else only when the listing is not a draft.
CREATE POLICY "Listing videos readable by owner or on non-draft listings"
  ON public.listing_videos FOR SELECT
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_id AND a.status <> 'draft')
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users: rows are written only by the
-- service role (server action) after the uploaded file has been validated.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('auction-videos', 'auction-videos', false, 20971520, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Sellers upload/read/delete only inside their own folder. The bucket is private, so nothing
-- here is publicly readable; videos are served through /api/listing-video after validation.
CREATE POLICY "Sellers upload videos to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'auction-videos' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Sellers read own video folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'auction-videos' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Sellers delete own video folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'auction-videos' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);
