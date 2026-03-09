-- Create the storage bucket for profile images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to profile images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Profile Images Public Access'
    ) THEN
        CREATE POLICY "Profile Images Public Access"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'profile-images');
    END IF;
END $$;

-- Allow authenticated users to upload their own profile images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Profile Images Auth Users Upload'
    ) THEN
        CREATE POLICY "Profile Images Auth Users Upload"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'profile-images'
            AND (auth.uid())::text = (string_to_array(name, '/'))[1]
        );
    END IF;
END $$;

-- Allow authenticated users to update their own profile images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Profile Images Auth Users Update'
    ) THEN
        CREATE POLICY "Profile Images Auth Users Update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'profile-images'
            AND (auth.uid())::text = (string_to_array(name, '/'))[1]
        );
    END IF;
END $$;

-- Allow authenticated users to delete their own profile images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Profile Images Auth Users Delete'
    ) THEN
        CREATE POLICY "Profile Images Auth Users Delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'profile-images'
            AND (auth.uid())::text = (string_to_array(name, '/'))[1]
        );
    END IF;
END $$;
