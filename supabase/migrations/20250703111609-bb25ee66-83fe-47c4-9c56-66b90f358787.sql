-- Add short_code column to forms table
ALTER TABLE public.forms 
ADD COLUMN short_code TEXT;

-- Create unique index for short_code
CREATE UNIQUE INDEX idx_forms_short_code ON public.forms(short_code) WHERE short_code IS NOT NULL;

-- Add check constraint for short_code format (6-8 alphanumeric characters)
ALTER TABLE public.forms 
ADD CONSTRAINT check_short_code_format 
CHECK (short_code IS NULL OR (short_code ~ '^[A-Z0-9]{6,8}$'));

-- Create function to generate unique short codes
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_length INTEGER := 6;
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
        IF NOT EXISTS (SELECT 1 FROM public.forms WHERE short_code = result) THEN
            RETURN result;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        -- If too many attempts with 6 chars, try 7 chars
        IF attempt_count > max_attempts / 2 AND code_length = 6 THEN
            code_length := 7;
        END IF;
        
        -- If still too many attempts, try 8 chars
        IF attempt_count > (max_attempts * 3 / 4) AND code_length = 7 THEN
            code_length := 8;
        END IF;
        
        -- If we've tried too many times, give up
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique short code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Create trigger to auto-generate short codes for new forms
CREATE OR REPLACE FUNCTION public.auto_generate_short_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.short_code IS NULL THEN
        NEW.short_code := public.generate_short_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_short_code
    BEFORE INSERT ON public.forms
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_short_code();