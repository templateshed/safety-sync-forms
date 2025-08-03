-- Create storage bucket for form photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-photos', 
  'form-photos', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- Create storage policies for photo uploads
CREATE POLICY "Anyone can upload form photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'form-photos');

CREATE POLICY "Anyone can view form photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'form-photos');

CREATE POLICY "Form owners can delete photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'form-photos');