
-- Add RLS policy to allow form creators to update responses to their forms
CREATE POLICY "Form creators can update responses to their forms" 
ON public.form_responses 
FOR UPDATE 
USING (
  form_id IN (
    SELECT id FROM forms WHERE user_id = auth.uid()
  )
);

-- Add audit trail columns to track response modifications
ALTER TABLE public.form_responses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_form_response_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_responses_updated_at
    BEFORE UPDATE ON public.form_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_response_updated_at();

-- Create function to add edit history entry
CREATE OR REPLACE FUNCTION public.add_response_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add to history if response_data actually changed
    IF OLD.response_data IS DISTINCT FROM NEW.response_data THEN
        NEW.edit_history = COALESCE(NEW.edit_history, '[]'::jsonb) || 
            jsonb_build_object(
                'timestamp', now(),
                'editor_id', auth.uid(),
                'previous_data', OLD.response_data,
                'changes', 'Response data modified'
            );
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_form_response_edit_history
    BEFORE UPDATE ON public.form_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.add_response_edit_history();
