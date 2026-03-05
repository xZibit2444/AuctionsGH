-- 012_auto_profile_trigger.sql
-- Create a trigger to automatically insert a profile when a new user signs up.
-- Also backfill any users who missed getting a profile from direct OAuth signups.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = '', public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
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
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill any existing users who don't have a profile yet (fixes the immediate error)
INSERT INTO public.profiles (id, username, full_name, avatar_url)
SELECT 
    id, 
    SPLIT_PART(email, '@', 1) || '_' || substr(md5(random()::text), 1, 6) AS username,
    COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)) AS full_name,
    raw_user_meta_data->>'avatar_url' AS avatar_url
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
