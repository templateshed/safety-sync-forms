-- Fix form_fields policies
DROP POLICY IF EXISTS "Authenticated users can view fields of published forms" ON public.form_fields;

-- Add public access policy for form fields (needed when viewing public forms)
CREATE POLICY "Public access to fields of published forms" 
ON public.form_fields 
FOR SELECT 
TO anon, authenticated
USING (form_id IN (
  SELECT id FROM public.forms 
  WHERE status = 'published'::form_status
));

-- Fix form_sections policies  
DROP POLICY IF EXISTS "Authenticated users can view sections of published forms" ON public.form_sections;

-- Add public access policy for form sections (needed when viewing public forms)
CREATE POLICY "Public access to sections of published forms" 
ON public.form_sections 
FOR SELECT 
TO anon, authenticated
USING (form_id IN (
  SELECT id FROM public.forms 
  WHERE status = 'published'::form_status
));