-- Fix the RLS policy for form_fields to allow access to all published forms, not just anonymous ones
DROP POLICY IF EXISTS "Public access to fields of published forms" ON public.form_fields;

CREATE POLICY "Public access to fields of published forms" 
ON public.form_fields 
FOR SELECT 
USING (form_id IN (
    SELECT forms.id
    FROM forms
    WHERE forms.status = 'published'::form_status
));