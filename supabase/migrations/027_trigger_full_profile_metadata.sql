-- 027_trigger_full_profile_metadata.sql
-- Update handle_new_user() to also persist phone_number and location
-- from signup metadata, so no separate client-side INSERT is needed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = '', public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, phone_number, location)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'location'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      username     = EXCLUDED.username,
      full_name    = EXCLUDED.full_name,
      avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      location     = COALESCE(EXCLUDED.location, profiles.location);

  RETURN NEW;
END;
$$;
