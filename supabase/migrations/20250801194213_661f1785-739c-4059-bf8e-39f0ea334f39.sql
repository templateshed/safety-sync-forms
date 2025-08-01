-- Update the RLS policy to allow both anonymous and authenticated users to submit to published forms
DROP POLICY IF EXISTS "Allow anonymous submissions for published forms" ON public.form_responses;

CREATE POLICY "Allow submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  form_id IN (
    SELECT forms.id
    FROM forms
    WHERE forms.status = 'published'::form_status 
      AND forms.allow_anonymous = true
  )
);