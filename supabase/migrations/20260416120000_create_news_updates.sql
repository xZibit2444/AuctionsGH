-- Create news_updates table
CREATE TABLE public.news_updates (
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
CREATE POLICY "Allow everyone to read published news" ON public.news_updates
  FOR SELECT USING (is_published = true);

-- Create policy to allow admins to manage news
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

CREATE TRIGGER update_news_updates_updated_at
  BEFORE UPDATE ON public.news_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();