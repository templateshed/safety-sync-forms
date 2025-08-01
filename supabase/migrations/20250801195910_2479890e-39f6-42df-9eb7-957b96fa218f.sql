-- Create a completely permissive policy for debugging
DROP POLICY IF EXISTS "Allow submissions for published forms" ON public.form_responses;

CREATE POLICY "Allow submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (true);