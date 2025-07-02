
-- Add business days columns to the forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS business_days_only BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_days JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS holiday_calendar TEXT DEFAULT 'US';

-- Add comment to explain the business_days column structure
COMMENT ON COLUMN public.forms.business_days IS 'Array of business day numbers (1=Monday, 2=Tuesday, ..., 5=Friday)';
