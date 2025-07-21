-- First unschedule the daily job that exists
SELECT cron.unschedule('check-form-due-dates-daily');

-- Create the correct cron job that runs every 30 minutes
SELECT cron.schedule(
  'check-form-due-dates-every-30min',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
        url:='https://jjwfyiaddsznftszmxhc.supabase.co/functions/v1/check-form-due-dates',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2Z5aWFkZHN6bmZ0c3pteGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyODUyMTcsImV4cCI6MjA2Njg2MTIxN30.tDZNGVclQg9TGPC0v8VXs8W2KJAjTtI35oNbY5pHDE4"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) AS request_id;
  $$
);