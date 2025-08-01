-- Remove the problematic foreign key constraints temporarily
ALTER TABLE public.form_responses DROP CONSTRAINT IF EXISTS form_responses_respondent_user_id_fkey;
ALTER TABLE public.form_responses DROP CONSTRAINT IF EXISTS form_responses_updated_by_fkey;