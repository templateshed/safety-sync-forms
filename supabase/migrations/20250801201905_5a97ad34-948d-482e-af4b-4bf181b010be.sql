-- Add a more permissive policy for accessing published forms
CREATE POLICY "Public access to all published forms" 
ON public.forms 
FOR SELECT 
USING (status = 'published'::form_status);

-- Also restore the foreign key constraints we removed earlier
ALTER TABLE public.form_responses 
ADD CONSTRAINT form_responses_respondent_user_id_fkey 
FOREIGN KEY (respondent_user_id) REFERENCES auth.users(id);

ALTER TABLE public.form_responses 
ADD CONSTRAINT form_responses_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES auth.users(id);