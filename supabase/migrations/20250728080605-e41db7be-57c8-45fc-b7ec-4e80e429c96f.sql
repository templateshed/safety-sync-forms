-- Update the get_form_responses_with_user_data function to include approval fields
CREATE OR REPLACE FUNCTION public.get_form_responses_with_user_data()
 RETURNS TABLE(id uuid, form_id uuid, respondent_email text, respondent_user_id uuid, response_data jsonb, submitted_at timestamp with time zone, ip_address inet, user_agent text, form_title text, first_name text, last_name text, effective_email text, form_fields jsonb, approved boolean, approved_at timestamp with time zone, approved_by uuid, updated_at timestamp with time zone, updated_by uuid, edit_history jsonb)
 LANGUAGE sql
 SECURITY DEFINER
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
                FROM form_fields ff
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
    FROM form_responses fr
    LEFT JOIN forms f ON fr.form_id = f.id
    LEFT JOIN profiles p ON fr.respondent_user_id = p.id
    WHERE f.user_id = auth.uid();
$function$;