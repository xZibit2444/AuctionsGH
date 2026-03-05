-- Create the storage bucket for auction images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for auction-images bucket

-- Allow public read access to all images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'auction-images');

-- Allow authenticated users to upload their own images
CREATE POLICY "Auth Users Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'auction-images' 
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Auth Users Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'auction-images' 
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Auth Users Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'auction-images' 
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);
