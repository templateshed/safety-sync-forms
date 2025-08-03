-- Make the form-photos bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE name = 'form-photos';

-- Create policies to allow public read access to form photos
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT 
USING (bucket_id = 'form-photos');

CREATE POLICY "Authenticated users can upload form photos" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'form-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own form photos" ON storage.objects
FOR UPDATE 
USING (bucket_id = 'form-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own form photos" ON storage.objects
FOR DELETE 
USING (bucket_id = 'form-photos' AND auth.role() = 'authenticated');