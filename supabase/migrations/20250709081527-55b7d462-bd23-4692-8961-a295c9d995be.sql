-- Fix the RLS policy to allow both anonymous and authenticated users to view published forms
-- This is needed so that form fillers (authenticated users) can access published forms

DROP POLICY IF EXISTS "Anonymous access to published forms" ON public.forms;

-- Create a policy that allows both anonymous and authenticated users to view published forms
-- This enables both public form access and authenticated form filling
CREATE POLICY "Public access to published forms" 
ON public.forms 
FOR SELECT 
TO anon, authenticated
USING (status = 'published'::form_status);