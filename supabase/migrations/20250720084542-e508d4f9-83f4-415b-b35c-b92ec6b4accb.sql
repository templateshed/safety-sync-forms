-- Create a cron job to check form due dates daily at 8 AM UTC
SELECT cron.schedule(
  'check-form-due-dates-daily',
  '0 8 * * *', -- Daily at 8 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://jjwfyiaddsznftszmxhc.supabase.co/functions/v1/check-form-due-dates',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2Z5aWFkZHN6bmZ0c3pteGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyODUyMTcsImV4cCI6MjA2Njg2MTIxN30.tDZNGVclQg9TGPC0v8VXs8W2KJAjTtI35oNbY5pHDE4"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) AS request_id;
  $$
);