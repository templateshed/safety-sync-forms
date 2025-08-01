-- Update the trigger function to only update updated_at when response data changes, not for approvals
CREATE OR REPLACE FUNCTION public.update_form_response_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- Only update updated_at if response_data changed, not for approval-only updates
    IF OLD.response_data IS DISTINCT FROM NEW.response_data THEN
        NEW.updated_at = now();
    ELSE
        -- Keep the original updated_at for approval-only changes
        NEW.updated_at = OLD.updated_at;
    END IF;
    RETURN NEW;
END;
$function$;