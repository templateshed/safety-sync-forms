
-- Create a security definer function to get form responses with user data
CREATE OR REPLACE FUNCTION public.get_form_responses_with_user_data()
RETURNS TABLE (
    id uuid,
    form_id uuid,
    respondent_email text,
    respondent_user_id uuid,
    response_data jsonb,
    submitted_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    form_title text,
    first_name text,
    last_name text,
    effective_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
        COALESCE(fr.respondent_email, au.email) as effective_email
    FROM form_responses fr
    LEFT JOIN forms f ON fr.form_id = f.id
    LEFT JOIN profiles p ON fr.respondent_user_id = p.id
    LEFT JOIN auth.users au ON fr.respondent_user_id = au.id
    WHERE EXISTS (
        SELECT 1 FROM forms 
        WHERE forms.id = fr.form_id 
        AND forms.user_id = auth.uid()
    );
$$;
