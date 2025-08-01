-- Create a policy that doesn't reference other tables
DROP POLICY IF EXISTS "Allow all inserts temporarily" ON public.form_responses;

-- Create policy for our specific form without referencing forms table
CREATE POLICY "Allow inserts for specific form" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (form_id = 'cef43ab1-ef71-47f4-811e-e19ff134fdae'::uuid);