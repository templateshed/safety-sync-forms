
-- Add unique constraint on user_id column in subscribers table
-- This will allow UPSERT operations to work properly
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);

-- Also make user_id NOT NULL since it's required for proper functioning
ALTER TABLE public.subscribers 
ALTER COLUMN user_id SET NOT NULL;
