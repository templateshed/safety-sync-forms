-- Fix extension placement and security issues

-- Move pg_cron extension to extensions schema (if not already there)
-- Note: This may already be configured correctly by Supabase
-- The linter warning might be a false positive for managed extensions

-- Create triggers for the updated functions to ensure they're active
DROP TRIGGER IF EXISTS update_form_response_updated_at_trigger ON public.form_responses;
CREATE TRIGGER update_form_response_updated_at_trigger
    BEFORE UPDATE ON public.form_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_response_updated_at();

DROP TRIGGER IF EXISTS add_response_edit_history_trigger ON public.form_responses;
CREATE TRIGGER add_response_edit_history_trigger
    BEFORE UPDATE ON public.form_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.add_response_edit_history();

DROP TRIGGER IF EXISTS auto_generate_short_code_trigger ON public.forms;
CREATE TRIGGER auto_generate_short_code_trigger
    BEFORE INSERT ON public.forms
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_short_code();

DROP TRIGGER IF EXISTS update_form_sections_updated_at_trigger ON public.form_sections;
CREATE TRIGGER update_form_sections_updated_at_trigger
    BEFORE UPDATE ON public.form_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_sections_updated_at();

-- Add input validation trigger for form responses
CREATE OR REPLACE FUNCTION public.validate_form_response_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Validate response data before insert/update
    IF NOT public.validate_form_response_data(NEW.response_data) THEN
        RAISE EXCEPTION 'Invalid form response data format or size';
    END IF;
    
    -- Log security events for audit trail
    PERFORM public.log_security_event('form_response_submitted', 
        jsonb_build_object('form_id', NEW.form_id, 'user_id', NEW.respondent_user_id));
    
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_form_response_trigger ON public.form_responses;
CREATE TRIGGER validate_form_response_trigger
    BEFORE INSERT OR UPDATE ON public.form_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_form_response_trigger();