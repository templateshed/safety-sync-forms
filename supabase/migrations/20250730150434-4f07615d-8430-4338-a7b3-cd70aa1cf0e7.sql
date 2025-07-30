-- Update RLS policies to allow anonymous submissions for published forms

-- Drop existing policy for form_responses INSERT
DROP POLICY IF EXISTS "Authenticated users can submit form responses" ON public.form_responses;

-- Create new policy to allow anonymous submissions for published forms
CREATE POLICY "Allow anonymous submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  form_id IN (
    SELECT id FROM public.forms 
    WHERE status = 'published'::form_status
  )
);

-- Drop existing policy for form_signatures INSERT
DROP POLICY IF EXISTS "Users can create signatures" ON public.form_signatures;

-- Create new policy to allow anonymous signature creation for published forms
CREATE POLICY "Allow anonymous signatures for published forms" 
ON public.form_signatures 
FOR INSERT 
WITH CHECK (
  response_id IN (
    SELECT fr.id 
    FROM public.form_responses fr
    JOIN public.forms f ON fr.form_id = f.id
    WHERE f.status = 'published'::form_status
  )
);