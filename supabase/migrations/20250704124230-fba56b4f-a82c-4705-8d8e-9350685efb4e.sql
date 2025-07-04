-- Create overdue form access codes table
CREATE TABLE public.overdue_form_access_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    access_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.overdue_form_access_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for access codes
CREATE POLICY "Form creators can create access codes for their forms" 
ON public.overdue_form_access_codes 
FOR INSERT 
WITH CHECK (
    form_id IN (
        SELECT id FROM public.forms 
        WHERE user_id = auth.uid()
    ) AND 
    created_by = auth.uid()
);

CREATE POLICY "Form creators can view access codes for their forms" 
ON public.overdue_form_access_codes 
FOR SELECT 
USING (
    form_id IN (
        SELECT id FROM public.forms 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Form creators can update access codes for their forms" 
ON public.overdue_form_access_codes 
FOR UPDATE 
USING (
    form_id IN (
        SELECT id FROM public.forms 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Form creators can delete access codes for their forms" 
ON public.overdue_form_access_codes 
FOR DELETE 
USING (
    form_id IN (
        SELECT id FROM public.forms 
        WHERE user_id = auth.uid()
    )
);

-- Allow authenticated users to check access codes (for form filling)
CREATE POLICY "Authenticated users can check valid access codes" 
ON public.overdue_form_access_codes 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
);

-- Function to generate unique access codes
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_length INTEGER := 8;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        result := '';
        -- Generate random code
        FOR i IN 1..code_length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.overdue_form_access_codes WHERE access_code = result) THEN
            RETURN result;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        -- If we've tried too many times, give up
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique access code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$;

-- Function to clean up expired access codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_access_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.overdue_form_access_codes 
    WHERE expires_at < now() AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function to mark access code as used
CREATE OR REPLACE FUNCTION public.mark_access_code_used(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.overdue_form_access_codes 
    SET used_at = now()
    WHERE access_code = code 
    AND used_at IS NULL 
    AND expires_at > now();
    
    RETURN FOUND;
END;
$$;

-- Function to get form by access code
CREATE OR REPLACE FUNCTION public.get_form_by_access_code(code TEXT)
RETURNS TABLE(
    form_id UUID,
    form_title TEXT,
    form_description TEXT,
    access_code_valid BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        f.id as form_id,
        f.title as form_title,
        f.description as form_description,
        (ac.used_at IS NULL AND ac.expires_at > now()) as access_code_valid
    FROM public.overdue_form_access_codes ac
    JOIN public.forms f ON ac.form_id = f.id
    WHERE ac.access_code = code;
$$;