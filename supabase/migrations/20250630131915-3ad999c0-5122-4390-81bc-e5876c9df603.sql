
-- Create enums for various status types
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due');
CREATE TYPE public.form_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.field_type AS ENUM ('text', 'email', 'number', 'select', 'checkbox', 'radio', 'textarea', 'date', 'file');
CREATE TYPE public.notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');

-- Create subscribers table for subscription management
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create forms table
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status form_status DEFAULT 'draft',
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create form fields table
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type field_type NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN DEFAULT false,
  options JSONB,
  validation_rules JSONB,
  conditional_logic JSONB,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create form responses table
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_email TEXT,
  response_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create scheduled forms table
CREATE TABLE public.scheduled_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL, -- 'once', 'daily', 'weekly', 'monthly'
  schedule_config JSONB NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create analytics table
CREATE TABLE public.form_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Insert subscription" ON public.subscribers
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for forms
CREATE POLICY "Users can view their own forms" ON public.forms
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create forms" ON public.forms
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own forms" ON public.forms
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own forms" ON public.forms
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for form fields
CREATE POLICY "Users can view fields of their forms" ON public.form_fields
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can create fields for their forms" ON public.form_fields
  FOR INSERT WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can update fields of their forms" ON public.form_fields
  FOR UPDATE USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete fields of their forms" ON public.form_fields
  FOR DELETE USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));

-- Create RLS policies for form responses
CREATE POLICY "Users can view responses to their forms" ON public.form_responses
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can submit form responses" ON public.form_responses
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for scheduled forms
CREATE POLICY "Users can view their scheduled forms" ON public.scheduled_forms
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can create scheduled forms" ON public.scheduled_forms
  FOR INSERT WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their scheduled forms" ON public.scheduled_forms
  FOR UPDATE USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their scheduled forms" ON public.scheduled_forms
  FOR DELETE USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can update notifications" ON public.notifications
  FOR UPDATE WITH CHECK (true);

-- Create RLS policies for analytics
CREATE POLICY "Users can view analytics for their forms" ON public.form_analytics
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "System can insert analytics" ON public.form_analytics
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_forms_user_id ON public.forms(user_id);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX idx_scheduled_forms_form_id ON public.scheduled_forms(form_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_form_analytics_form_id ON public.form_analytics(form_id);
