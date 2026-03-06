-- 026_unique_phone_number.sql
-- Enforce that no two accounts can share the same phone number.
-- Email uniqueness is already guaranteed by Supabase Auth (auth.users).

-- Step 1: Nullify duplicate phone numbers, keeping the earliest-created profile for each number.
-- This resolves any existing duplicates (e.g. test accounts) before the constraint is added.
UPDATE public.profiles p
SET    phone_number = NULL
WHERE  phone_number IS NOT NULL
  AND  id NOT IN (
      SELECT DISTINCT ON (phone_number) id
      FROM   public.profiles
      WHERE  phone_number IS NOT NULL
      ORDER  BY phone_number, created_at ASC
  );

-- Step 2: Add the UNIQUE constraint (idempotent).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'profiles_phone_number_key'
          AND  conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
    END IF;
END $$;
