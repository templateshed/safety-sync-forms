-- Add a field to control anonymous access for forms
ALTER TABLE public.forms 
ADD COLUMN allow_anonymous boolean NOT NULL DEFAULT false;

-- Update the RLS policy for public access to check the new field
DROP POLICY IF EXISTS "Public access to published forms" ON public.forms;

CREATE POLICY "Public access to published forms" 
ON public.forms 
FOR SELECT 
USING (status = 'published'::form_status AND allow_anonymous = true);

-- Also update the form_fields policy to respect the new setting
DROP POLICY IF EXISTS "Public access to fields of published forms" ON public.form_fields;

CREATE POLICY "Public access to fields of published forms" 
ON public.form_fields 
FOR SELECT 
USING (form_id IN ( 
  SELECT forms.id
  FROM forms
  WHERE forms.status = 'published'::form_status 
    AND forms.allow_anonymous = true
));

-- Update the form_responses policy to allow anonymous submissions only for forms that allow it
DROP POLICY IF EXISTS "Allow anonymous submissions for published forms" ON public.form_responses;

CREATE POLICY "Allow anonymous submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (form_id IN ( 
  SELECT forms.id
  FROM forms
  WHERE forms.status = 'published'::form_status 
    AND forms.allow_anonymous = true
));

-- Also update form_signatures policy
DROP POLICY IF EXISTS "Allow anonymous signatures for published forms" ON public.form_signatures;

CREATE POLICY "Allow anonymous signatures for published forms" 
ON public.form_signatures 
FOR INSERT 
WITH CHECK (response_id IN ( 
  SELECT fr.id
  FROM form_responses fr
  JOIN forms f ON fr.form_id = f.id
  WHERE f.status = 'published'::form_status 
    AND f.allow_anonymous = true
));