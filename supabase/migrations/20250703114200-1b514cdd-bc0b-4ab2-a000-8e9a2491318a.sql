-- Create form_sections table
CREATE TABLE public.form_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_collapsible BOOLEAN NOT NULL DEFAULT true,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.form_sections 
ADD CONSTRAINT form_sections_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;

-- Add section_id column to form_fields table
ALTER TABLE public.form_fields 
ADD COLUMN section_id UUID REFERENCES public.form_sections(id) ON DELETE SET NULL;

-- Enable Row Level Security for form_sections
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for form_sections
CREATE POLICY "Users can view sections of their forms" 
ON public.form_sections 
FOR SELECT 
USING (form_id IN (
  SELECT id FROM public.forms WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create sections for their forms" 
ON public.form_sections 
FOR INSERT 
WITH CHECK (form_id IN (
  SELECT id FROM public.forms WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update sections of their forms" 
ON public.form_sections 
FOR UPDATE 
USING (form_id IN (
  SELECT id FROM public.forms WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete sections of their forms" 
ON public.form_sections 
FOR DELETE 
USING (form_id IN (
  SELECT id FROM public.forms WHERE user_id = auth.uid()
));

-- Create policies for viewing sections of published forms
CREATE POLICY "Authenticated users can view sections of published forms" 
ON public.form_sections 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  form_id IN (
    SELECT id FROM public.forms WHERE status = 'published'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_form_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_form_sections_updated_at
BEFORE UPDATE ON public.form_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_form_sections_updated_at();

-- Create index for better performance
CREATE INDEX idx_form_sections_form_id ON public.form_sections(form_id);
CREATE INDEX idx_form_sections_order_index ON public.form_sections(form_id, order_index);
CREATE INDEX idx_form_fields_section_id ON public.form_fields(section_id);