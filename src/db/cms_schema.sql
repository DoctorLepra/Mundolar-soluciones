-- Create the site_content table for the CMS
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL, -- e.g., 'inicio', 'servicios', 'nosotros', 'contacto'
  section TEXT NOT NULL, -- e.g., 'hero', 'metrics', 'services_list'
  key TEXT NOT NULL, -- e.g., 'hero_title', 'main_description'
  content JSONB NOT NULL, -- Stores text, image URLs, or arrays of objects
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ensure uniqueness of content keys per page/section
  UNIQUE(page, section, key)
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone (Public) to see the content
CREATE POLICY "Allow public read access to site_content" ON public.site_content
  FOR SELECT USING (true);

-- Management policy: Allow only Admins to manage content
-- Assuming there is a profiles table with a role column
CREATE POLICY "Allow admins to manage site_content" ON public.site_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION update_site_content_timestamp();
