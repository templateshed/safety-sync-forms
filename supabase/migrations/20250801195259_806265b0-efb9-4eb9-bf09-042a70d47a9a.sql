-- Temporarily create a very permissive policy for debugging
DROP POLICY IF EXISTS "Allow submissions for published forms" ON public.form_responses;

CREATE POLICY "Allow submissions for published forms" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  form_id = 'cef43ab1-ef71-47f4-811e-e19ff134fdae'::uuid
);