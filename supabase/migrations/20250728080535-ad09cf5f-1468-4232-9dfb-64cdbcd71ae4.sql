-- Check if approval columns exist and add them if missing
DO $$ 
BEGIN
    -- Add approved column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_responses' AND column_name = 'approved') THEN
        ALTER TABLE public.form_responses ADD COLUMN approved boolean DEFAULT false;
    END IF;
    
    -- Add approved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_responses' AND column_name = 'approved_at') THEN
        ALTER TABLE public.form_responses ADD COLUMN approved_at timestamp with time zone;
    END IF;
    
    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_responses' AND column_name = 'approved_by') THEN
        ALTER TABLE public.form_responses ADD COLUMN approved_by uuid;
    END IF;
END $$;