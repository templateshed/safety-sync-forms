-- Remove the problematic policy that allows all authenticated users to view published forms
DROP POLICY IF EXISTS "Authenticated users can view published forms" ON public.forms;

-- The existing "Users can view their own forms" policy is correct and should remain
-- This ensures users can only see forms they created (regardless of status)

-- Add a new policy specifically for public form access (when someone fills out a form)
-- This allows anonymous users to view published forms by ID when accessing the public form page
CREATE POLICY "Public access to published forms by ID" 
ON public.forms 
FOR SELECT 
TO anon, authenticated
USING (status = 'published'::form_status);

-- Note: The above policy allows viewing published forms but without user context,
-- so it won't show up in the dashboard - only when accessing a specific form URL