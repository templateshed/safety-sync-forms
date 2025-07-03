-- Fix the conditional logic field reference for the "What's wrong?" field
UPDATE form_fields 
SET conditional_logic = jsonb_set(
  conditional_logic,
  '{rules,0,fieldId}',
  '"ee94e54d-3541-4fc9-b94b-a7c0bba72aaf"'
)
WHERE label = 'What''s wrong?' 
AND conditional_logic->>'action' = 'show'
AND conditional_logic->'rules'->0->>'fieldId' = 'ed82f92d-f800-4332-8ff9-1e78453432e5';