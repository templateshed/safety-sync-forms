-- Remove overdue form access codes table and related functions
DROP TABLE IF EXISTS public.overdue_form_access_codes CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.generate_access_code() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_access_codes() CASCADE;
DROP FUNCTION IF EXISTS public.mark_access_code_used(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_form_by_access_code(text) CASCADE;