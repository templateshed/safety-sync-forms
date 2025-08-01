-- Drop the previous policy that has timing issues
DROP POLICY IF EXISTS "Authenticated users can create signatures for published forms" ON public.form_signatures;

-- Create a new policy that checks the form directly via field_id
CREATE POLICY "Authenticated users can create signatures for published forms" 
ON public.form_signatures 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND field_id IN (
    SELECT ff.id
    FROM form_fields ff
    JOIN forms f ON ff.form_id = f.id
    WHERE f.status = 'published'::form_status
  )
);