
-- Add columns to form_responses table to handle late submissions and compliance reporting
ALTER TABLE public.form_responses 
ADD COLUMN intended_submission_date timestamp with time zone,
ADD COLUMN is_late_submission boolean DEFAULT false,
ADD COLUMN compliance_notes text;

-- Create index for better query performance on compliance reporting
CREATE INDEX idx_form_responses_intended_date ON public.form_responses(intended_submission_date);
CREATE INDEX idx_form_responses_late_submission ON public.form_responses(is_late_submission);

-- Add a function to calculate the intended submission date based on form schedule
CREATE OR REPLACE FUNCTION public.calculate_intended_submission_date(
  form_schedule_start_date timestamp with time zone,
  form_schedule_type text,
  current_date timestamp with time zone DEFAULT now()
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- For one-time forms, return the scheduled start date
  IF form_schedule_type = 'one_time' THEN
    RETURN form_schedule_start_date;
  END IF;
  
  -- For daily forms, return the most recent scheduled date before current date
  IF form_schedule_type = 'daily' THEN
    -- If current date is before start date, return start date
    IF current_date < form_schedule_start_date THEN
      RETURN form_schedule_start_date;
    END IF;
    
    -- Return the date component of current date with time from schedule
    RETURN date_trunc('day', current_date) + 
           (form_schedule_start_date - date_trunc('day', form_schedule_start_date));
  END IF;
  
  -- Default fallback
  RETURN form_schedule_start_date;
END;
$$;
