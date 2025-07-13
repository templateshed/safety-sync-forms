-- Create table to store cleared form instances
CREATE TABLE public.cleared_form_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  form_id uuid NOT NULL,
  instance_date date NOT NULL,
  cleared_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, form_id, instance_date)
);

-- Enable Row Level Security
ALTER TABLE public.cleared_form_instances ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own cleared instances" 
ON public.cleared_form_instances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cleared instances" 
ON public.cleared_form_instances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleared instances" 
ON public.cleared_form_instances 
FOR DELETE 
USING (auth.uid() = user_id);