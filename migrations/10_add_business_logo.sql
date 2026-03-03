-- Migration 10: Add logo_url column to businesses table and create storage bucket

-- 1. Add logo_url column
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create storage bucket for business logos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-logos',
    'business-logos',
    true,
    2097152,  -- 2MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: Allow authenticated users to upload to their business folder
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'business-logos');

CREATE POLICY "Allow public read access to logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-logos');
