-- Fix the conditional logic field reference and field type issues

-- First, fix the conditional logic field reference for the "What's wrong?" field
-- Change from incorrect field ID to the correct "Wheel Condition" field ID
UPDATE form_fields 
SET conditional_logic = jsonb_set(
  conditional_logic,
  '{rules,0,fieldId}',
  '"ddbeb1ba-0ec2-4e89-ac25-ea1deb461dd8"'
)
WHERE label = 'What''s wrong?' 
AND conditional_logic->>'action' = 'show'
AND conditional_logic->'rules'->0->>'fieldId' = 'ee94e54d-3541-4fc9-b94b-a7c0bba72aaf';

-- Second, fix the "Wheel Condition" field type from checkbox to radio for single selection
UPDATE form_fields 
SET field_type = 'radio'
WHERE id = 'ddbeb1ba-0ec2-4e89-ac25-ea1deb461dd8'
AND field_type = 'checkbox';