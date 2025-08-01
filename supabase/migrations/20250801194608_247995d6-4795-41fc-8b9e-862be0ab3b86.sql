-- Create a more explicit policy for debugging
DROP POLICY IF EXISTS "Allow submissions for published forms" ON public.form_responses;

CREATE POLICY "Allow submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms 
    WHERE forms.id = form_id 
      AND forms.status = 'published'::form_status 
      AND forms.allow_anonymous = true
  )
);