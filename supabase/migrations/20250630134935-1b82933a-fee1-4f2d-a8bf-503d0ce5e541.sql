
-- Add scheduling columns to the forms table
ALTER TABLE public.forms 
ADD COLUMN schedule_type TEXT DEFAULT 'one_time',
ADD COLUMN schedule_frequency TEXT,
ADD COLUMN schedule_days JSONB,
ADD COLUMN schedule_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN schedule_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN schedule_time TIME,
ADD COLUMN schedule_timezone TEXT DEFAULT 'UTC';

-- Add a comment to clarify schedule_type values
COMMENT ON COLUMN public.forms.schedule_type IS 'Values: one_time, daily, weekly, monthly, custom';
COMMENT ON COLUMN public.forms.schedule_frequency IS 'For custom schedules: every_x_days, every_x_weeks, etc';
COMMENT ON COLUMN public.forms.schedule_days IS 'Array of days for weekly schedules: [0,1,2,3,4,5,6] where 0=Sunday';
