-- 043_enforce_unique_normalized_usernames.sql
-- Ensure usernames are unique regardless of case or surrounding whitespace.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    GROUP BY lower(btrim(username))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce unique normalized usernames: duplicate usernames exist when compared case-insensitively.';
  END IF;
END;
$$;

UPDATE public.profiles
SET username = lower(btrim(username))
WHERE username <> lower(btrim(username));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_normalized_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_normalized_chk
      CHECK (username = lower(btrim(username)));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = '', public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, phone_number, location)
  VALUES (
    NEW.id,
    lower(
      btrim(
        COALESCE(
          NEW.raw_user_meta_data->>'username',
          SPLIT_PART(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)
        )
      )
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
