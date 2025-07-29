-- Fix database function security by setting proper search_path
-- This prevents potential security vulnerabilities from search path manipulation

-- Update existing functions to include SECURITY DEFINER SET search_path = ''
CREATE OR REPLACE FUNCTION public.update_form_response_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_response_edit_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Only add to history if response_data actually changed
    IF OLD.response_data IS DISTINCT FROM NEW.response_data THEN
        NEW.edit_history = COALESCE(NEW.edit_history, '[]'::jsonb) || 
            jsonb_build_object(
                'timestamp', now(),
                'editor_id', auth.uid(),
                'previous_data', OLD.response_data,
                'changes', 'Response data modified'
            );
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_short_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_length INTEGER := 6;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        result := '';
        -- Generate random code
        FOR i IN 1..code_length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.forms WHERE short_code = result) THEN
            RETURN result;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        -- If too many attempts with 6 chars, try 7 chars
        IF attempt_count > max_attempts / 2 AND code_length = 6 THEN
            code_length := 7;
        END IF;
        
        -- If still too many attempts, try 8 chars
        IF attempt_count > (max_attempts * 3 / 4) AND code_length = 7 THEN
            code_length := 8;
        END IF;
        
        -- If we've tried too many times, give up
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique short code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_short_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    IF NEW.short_code IS NULL THEN
        NEW.short_code := public.generate_short_code();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_form_sections_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_form_responses_with_user_data()
 RETURNS TABLE(id uuid, form_id uuid, respondent_email text, respondent_user_id uuid, response_data jsonb, submitted_at timestamp with time zone, ip_address inet, user_agent text, form_title text, first_name text, last_name text, effective_email text, form_fields jsonb, approved boolean, approved_at timestamp with time zone, approved_by uuid, updated_at timestamp with time zone, updated_by uuid, edit_history jsonb)
 LANGUAGE sql
 SECURITY DEFINER SET search_path = ''
AS $function$
    SELECT 
        fr.id,
        fr.form_id,
        fr.respondent_email,
        fr.respondent_user_id,
        fr.response_data,
        fr.submitted_at,
        fr.ip_address,
        fr.user_agent,
        f.title as form_title,
        p.first_name,
        p.last_name,
        COALESCE(fr.respondent_email, p.first_name || ' ' || p.last_name) as effective_email,
        COALESCE(
            (
                SELECT jsonb_object_agg(ff.id::text, ff.label)
                FROM public.form_fields ff
                WHERE ff.form_id = fr.form_id
            ),
            '{}'::jsonb
        ) as form_fields,
        fr.approved,
        fr.approved_at,
        fr.approved_by,
        fr.updated_at,
        fr.updated_by,
        fr.edit_history
    FROM public.form_responses fr
    LEFT JOIN public.forms f ON fr.form_id = f.id
    LEFT JOIN public.profiles p ON fr.respondent_user_id = p.id
    WHERE f.user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$function$;

-- Create input validation functions for enhanced security
CREATE OR REPLACE FUNCTION public.validate_form_response_data(response_data jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Check if response_data is valid JSON object
    IF response_data IS NULL OR jsonb_typeof(response_data) != 'object' THEN
        RETURN false;
    END IF;
    
    -- Check for reasonable size limits (max 1MB)
    IF octet_length(response_data::text) > 1048576 THEN
        RETURN false;
    END IF;
    
    -- Additional validation can be added here
    RETURN true;
END;
$function$;

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    event_data jsonb DEFAULT '{}'::jsonb,
    user_id_param uuid DEFAULT auth.uid()
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Log security events for monitoring
    -- This is a placeholder - in production you might want a dedicated audit table
    RAISE LOG 'Security Event: % by user % with data: %', event_type, user_id_param, event_data;
END;
$function$;