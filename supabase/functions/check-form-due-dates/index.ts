import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Form {
  id: string;
  user_id: string;
  title: string;
  short_code: string;
  schedule_type: string;
  schedule_start_date: string;
  schedule_end_date?: string;
  schedule_time?: string;
  business_days_only: boolean;
  business_days?: number[];
}

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
}

// Business days utility functions
function isBusinessDay(date: Date, businessDaysOnly: boolean, businessDays: number[]): boolean {
  if (!businessDaysOnly) return true;
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  return businessDays.includes(dayOfWeek);
}

function isFormDueToday(form: Form, today: Date): { isDue: boolean; isOverdue: boolean } {
  const startDate = new Date(form.schedule_start_date);
  const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
  
  // Check if today is within the schedule range
  if (today < startDate) {
    return { isDue: false, isOverdue: false };
  }
  
  if (endDate && today > endDate) {
    return { isDue: false, isOverdue: false };
  }
  
  // Check business days
  const businessDays = form.business_days || [1, 2, 3, 4, 5]; // Default to weekdays
  if (!isBusinessDay(today, form.business_days_only, businessDays)) {
    return { isDue: false, isOverdue: false };
  }
  
  // For daily forms, check if it's due today
  if (form.schedule_type === 'daily') {
    return { isDue: true, isOverdue: false };
  }
  
  // Add other schedule types as needed
  return { isDue: false, isOverdue: false };
}

async function checkForOverdueForms(forms: Form[], today: Date) {
  const overdueResults = [];
  
  for (const form of forms) {
    // Check if form was due yesterday but not completed
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { isDue: wasDueYesterday } = isFormDueToday(form, yesterday);
    
    if (wasDueYesterday) {
      // Check if there's a response for yesterday
      const { data: responses } = await supabase
        .from('form_responses')
        .select('id')
        .eq('form_id', form.id)
        .gte('submitted_at', yesterday.toISOString().split('T')[0])
        .lt('submitted_at', today.toISOString().split('T')[0]);
      
      if (!responses || responses.length === 0) {
        overdueResults.push(form);
      }
    }
  }
  
  return overdueResults;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting form due date check...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    // Get all published forms
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select(`
        id,
        user_id,
        title,
        short_code,
        schedule_type,
        schedule_start_date,
        schedule_end_date,
        schedule_time,
        business_days_only,
        business_days
      `)
      .eq('status', 'published')
      .not('schedule_type', 'is', null);

    if (formsError) {
      throw formsError;
    }

    console.log(`Found ${forms?.length || 0} published forms to check`);

    if (!forms || forms.length === 0) {
      return new Response(JSON.stringify({ message: "No forms to check" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Group forms by user
    const userForms: Record<string, Form[]> = {};
    forms.forEach(form => {
      if (!userForms[form.user_id]) {
        userForms[form.user_id] = [];
      }
      userForms[form.user_id].push(form);
    });

    // Check each user's forms
    const notifications = [];
    
    for (const [userId, userFormList] of Object.entries(userForms)) {
      console.log(`Checking forms for user ${userId}`);
      
      // Get user profile and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      
      if (!user?.user?.email) {
        console.log(`No email found for user ${userId}, skipping`);
        continue;
      }
      
      const dueToday: Form[] = [];
      const overdue: Form[] = [];
      
      // Check forms due today
      for (const form of userFormList) {
        const { isDue } = isFormDueToday(form, today);
        
        if (isDue) {
          // Check if already completed today
          const { data: responses } = await supabase
            .from('form_responses')
            .select('id')
            .eq('form_id', form.id)
            .gte('submitted_at', today.toISOString());
          
          if (!responses || responses.length === 0) {
            dueToday.push(form);
          }
        }
      }
      
      // Check for overdue forms
      const overdueToday = await checkForOverdueForms(userFormList, today);
      overdue.push(...overdueToday);
      
      // Send notification if there are due or overdue forms
      if (dueToday.length > 0 || overdue.length > 0) {
        const allForms = [
          ...dueToday.map(f => ({ ...f, dueType: 'due' as const })),
          ...overdue.map(f => ({ ...f, dueType: 'overdue' as const }))
        ];
        
        const formattedForms = allForms.map(form => ({
          title: form.title,
          dueType: form.dueType,
          shortCode: form.short_code,
          url: `${supabaseUrl.replace('supabase.co', 'supabase.app')}/form/${form.short_code}`
        }));
        
        const name = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || 'there';
        
        const overdueCount = overdue.length;
        const dueCount = dueToday.length;
        
        let subject = "";
        if (overdueCount > 0 && dueCount > 0) {
          subject = `⚠️ ${overdueCount} overdue and ${dueCount} due form${dueCount > 1 ? 's' : ''}`;
        } else if (overdueCount > 0) {
          subject = `⚠️ ${overdueCount} overdue form${overdueCount > 1 ? 's' : ''}`;
        } else {
          subject = `📅 ${dueCount} form${dueCount > 1 ? 's' : ''} due today`;
        }
        
        // Call the email notification function
        const emailResponse = await supabase.functions.invoke('send-form-notifications', {
          body: {
            email: user.user.email,
            name,
            subject,
            forms: formattedForms
          }
        });
        
        if (emailResponse.error) {
          console.error(`Failed to send email to ${user.user.email}:`, emailResponse.error);
        } else {
          console.log(`Email sent successfully to ${user.user.email}`);
          notifications.push({
            userId,
            email: user.user.email,
            dueCount,
            overdueCount
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${forms.length} forms for ${Object.keys(userForms).length} users`,
      notifications: notifications.length,
      results: notifications
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in check-form-due-dates function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);