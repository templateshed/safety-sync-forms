-- Fix the conditional logic field reference and field type issues

-- First, fix the conditional logic field reference for the "What's wrong?" field
-- Change to the correct "Wheel Condition" field ID
UPDATE form_fields 
SET conditional_logic = jsonb_set(
  conditional_logic,
  '{rules,0,fieldId}',
  '"99aa86d9-92e2-41dd-98b1-6878c50b8cb2"'
)
WHERE label = 'What''s wrong?' 
AND conditional_logic->>'action' = 'show';

-- Second, fix the "Wheel Condition" field type from checkbox to radio for single selection
UPDATE form_fields 
SET field_type = 'radio'
WHERE id = '99aa86d9-92e2-41dd-98b1-6878c50b8cb2'
AND field_type = 'checkbox';