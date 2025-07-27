-- Add approval fields to form_responses table
ALTER TABLE public.form_responses 
ADD COLUMN approved BOOLEAN DEFAULT FALSE,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID;

-- Add index for better performance when filtering by approval status
CREATE INDEX idx_form_responses_approved ON public.form_responses(approved);

-- Update RLS policy to allow form creators to update approval status
-- (This is already covered by existing policies, but good to document)

-- Add comment for documentation
COMMENT ON COLUMN public.form_responses.approved IS 'Whether the response has been approved by the form owner';
COMMENT ON COLUMN public.form_responses.approved_at IS 'Timestamp when the response was approved';
COMMENT ON COLUMN public.form_responses.approved_by IS 'User ID who approved the response';