
-- Add account type to the subscribers table to track user account types
ALTER TABLE public.subscribers 
ADD COLUMN account_type TEXT DEFAULT 'form_filler' CHECK (account_type IN ('form_creator', 'form_filler'));

-- Update existing records to have the form_creator type if they have any forms
UPDATE public.subscribers 
SET account_type = 'form_creator' 
WHERE user_id IN (SELECT DISTINCT user_id FROM public.forms WHERE user_id IS NOT NULL);

-- Create index for better performance
CREATE INDEX idx_subscribers_account_type ON public.subscribers(account_type);
