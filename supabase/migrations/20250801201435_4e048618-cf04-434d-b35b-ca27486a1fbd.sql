-- Create a security definer function to bypass RLS for anonymous submissions
CREATE OR REPLACE FUNCTION public.insert_anonymous_form_response(
    p_form_id uuid,
    p_response_data jsonb,
    p_respondent_email text,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    response_id uuid;
BEGIN
    -- Insert the form response directly, bypassing RLS
    INSERT INTO public.form_responses (
        form_id,
        response_data,
        respondent_email,
        respondent_user_id,
        ip_address,
        user_agent
    ) VALUES (
        p_form_id,
        p_response_data,
        p_respondent_email,
        NULL,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO response_id;
    
    RETURN response_id;
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION public.insert_anonymous_form_response TO anon;