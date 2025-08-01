-- Add RLS policy to allow authenticated users to insert signatures for published forms
CREATE POLICY "Authenticated users can create signatures for published forms" 
ON public.form_signatures 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND response_id IN (
    SELECT fr.id
    FROM form_responses fr
    JOIN forms f ON fr.form_id = f.id
    WHERE f.status = 'published'::form_status
  )
);