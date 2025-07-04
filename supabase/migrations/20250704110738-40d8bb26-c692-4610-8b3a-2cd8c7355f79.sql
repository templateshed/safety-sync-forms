
-- Add signature field type to the enum
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'signature';

-- Create a table to store signature data separately for better performance
CREATE TABLE IF NOT EXISTS public.form_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL,
  field_id UUID NOT NULL,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  typed_name TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (response_id) REFERENCES form_responses(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
);

-- Add RLS policies for signature data
ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view signatures for forms they own
CREATE POLICY "Form owners can view signatures" 
  ON public.form_signatures 
  FOR SELECT 
  USING (
    response_id IN (
      SELECT fr.id 
      FROM form_responses fr 
      JOIN forms f ON fr.form_id = f.id 
      WHERE f.user_id = auth.uid()
    )
  );

-- Authenticated users can insert signatures when submitting forms
CREATE POLICY "Users can create signatures" 
  ON public.form_signatures 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Form owners can update signatures
CREATE POLICY "Form owners can update signatures" 
  ON public.form_signatures 
  FOR UPDATE 
  USING (
    response_id IN (
      SELECT fr.id 
      FROM form_responses fr 
      JOIN forms f ON fr.form_id = f.id 
      WHERE f.user_id = auth.uid()
    )
  );

-- Form owners can delete signatures
CREATE POLICY "Form owners can delete signatures" 
  ON public.form_signatures 
  FOR DELETE 
  USING (
    response_id IN (
      SELECT fr.id 
      FROM form_responses fr 
      JOIN forms f ON fr.form_id = f.id 
      WHERE f.user_id = auth.uid()
    )
  );
