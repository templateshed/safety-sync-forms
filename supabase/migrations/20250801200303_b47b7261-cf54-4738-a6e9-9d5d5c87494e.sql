-- Re-enable RLS and create proper policy for anonymous submissions
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Drop the temporary policy
DROP POLICY IF EXISTS "Allow submissions for published forms" ON public.form_responses;

-- Create proper policy for anonymous submissions to published forms
CREATE POLICY "Allow anonymous submissions to published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  form_id IN (
    SELECT f.id 
    FROM public.forms f 
    WHERE f.status = 'published' 
    AND f.allow_anonymous = true
  )
);

-- Re-enable the validation trigger
CREATE TRIGGER validate_form_response_trigger
BEFORE INSERT OR UPDATE ON public.form_responses
FOR EACH ROW EXECUTE FUNCTION public.validate_form_response_trigger();