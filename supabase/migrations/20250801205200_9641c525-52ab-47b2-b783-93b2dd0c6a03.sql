-- Add RLS policy to allow authenticated users to insert responses for published forms
CREATE POLICY "Authenticated users can submit responses to published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND form_id IN (
    SELECT f.id
    FROM forms f
    WHERE f.status = 'published'::form_status
  )
);