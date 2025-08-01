-- Drop existing policy and create an extremely simple one
DROP POLICY IF EXISTS "Allow anonymous submissions to published forms" ON public.form_responses;

-- Create the simplest possible INSERT policy
CREATE POLICY "Allow all inserts temporarily" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (true);