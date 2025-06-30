
-- Add respondent_user_id column to form_responses to track who submitted each response
ALTER TABLE public.form_responses 
ADD COLUMN respondent_user_id UUID REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX idx_form_responses_respondent_user_id ON public.form_responses(respondent_user_id);

-- Add RLS policies to ensure only authenticated users can access published forms
CREATE POLICY "Authenticated users can view published forms" ON public.forms
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'published');

CREATE POLICY "Authenticated users can view fields of published forms" ON public.form_fields
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    form_id IN (SELECT id FROM public.forms WHERE status = 'published')
  );

-- Update form responses policy to capture authenticated user and allow viewing own responses
DROP POLICY IF EXISTS "Anyone can submit form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Users can view responses to their forms" ON public.form_responses;

CREATE POLICY "Authenticated users can submit form responses" ON public.form_responses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view responses to their forms" ON public.form_responses
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own form responses" ON public.form_responses
  FOR SELECT USING (respondent_user_id = auth.uid());
