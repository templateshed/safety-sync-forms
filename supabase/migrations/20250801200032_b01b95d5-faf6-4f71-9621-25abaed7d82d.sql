-- Temporarily disable the validation trigger to isolate the RLS issue
DROP TRIGGER IF EXISTS validate_form_response_trigger ON public.form_responses;