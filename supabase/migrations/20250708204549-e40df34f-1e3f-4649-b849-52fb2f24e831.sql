-- Fix the public access policy to only apply to anonymous users
-- and be more restrictive for the dashboard context
DROP POLICY IF EXISTS "Public access to published forms by ID" ON public.forms;

-- Create a more restrictive policy for anonymous access to published forms
-- This only allows anonymous users to view published forms (for public form filling)
CREATE POLICY "Anonymous access to published forms" 
ON public.forms 
FOR SELECT 
TO anon
USING (status = 'published'::form_status);

-- The existing "Users can view their own forms" policy remains unchanged
-- This ensures authenticated users in the dashboard only see their own forms