-- Remove all conditional logic from form fields
UPDATE form_fields 
SET conditional_logic = NULL
WHERE conditional_logic IS NOT NULL;