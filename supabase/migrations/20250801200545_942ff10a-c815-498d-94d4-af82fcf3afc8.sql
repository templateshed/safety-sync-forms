-- Temporarily disable the validation trigger again to isolate the issue
DROP TRIGGER IF EXISTS validate_form_response_trigger ON public.form_responses;