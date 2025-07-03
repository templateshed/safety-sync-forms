-- Fix the conditional logic field reference for the "What's wrong?" field
-- Update to reference the correct "Wheel Condition" field ID
UPDATE form_fields 
SET conditional_logic = jsonb_set(
  conditional_logic,
  '{rules,0,fieldId}',
  '"99aa86d9-92e2-41dd-98b1-6878c50b8cb2"'::jsonb
)
WHERE id = 'a0a10a11-b0e5-4c3d-bb62-8373d959dd8c'
AND label = 'What''s wrong?';