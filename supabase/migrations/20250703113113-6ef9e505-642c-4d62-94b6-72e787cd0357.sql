-- Add company column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN company TEXT;