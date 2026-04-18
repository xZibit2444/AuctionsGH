require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Create news_updates table
CREATE TABLE IF NOT EXISTS public.news_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read published news
DROP POLICY IF EXISTS "Allow everyone to read published news" ON public.news_updates;
CREATE POLICY "Allow everyone to read published news" ON public.news_updates
  FOR SELECT USING (is_published = true);

-- Create policy to allow admins to manage news
DROP POLICY IF EXISTS "Allow admins to manage news" ON public.news_updates;
CREATE POLICY "Allow admins to manage news" ON public.news_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_news_updates_updated_at ON public.news_updates;
CREATE TRIGGER update_news_updates_updated_at
  BEFORE UPDATE ON public.news_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function runMigration() {
  try {
    console.log('Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    if (error) {
      console.error('Error running migration:', error);
      // Try direct execution
      const { error: directError } = await supabase.from('news_updates').select('*').limit(1);
      if (directError && directError.message.includes('relation "public.news_updates" does not exist')) {
        console.log('Table does not exist, creating...');
        // Since rpc exec_sql might not be available, let's try to create a simple test
        console.log('Please run the migration manually in Supabase dashboard or CLI');
      }
    } else {
      console.log('Migration completed successfully');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();