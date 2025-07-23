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
  // Convert JavaScript day (0=Sunday) to our format (1=Monday, 7=Sunday)
  const businessDayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  console.log(`Business day check: dayOfWeek=${dayOfWeek}, businessDayNumber=${businessDayNumber}, businessDays=${JSON.stringify(businessDays)}, includes=${businessDays.includes(businessDayNumber)}`);
  
  return businessDays.includes(businessDayNumber);
}

function isFormDueToday(form: Form, currentDateTime: Date): { isDue: boolean; isOverdue: boolean } {
  const startDate = new Date(form.schedule_start_date);
  const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
  
  // Get just the date part for comparison
  const currentDate = new Date(currentDateTime);
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if today is within the schedule range
  if (currentDate < startDate) {
    return { isDue: false, isOverdue: false };
  }
  
  if (endDate && currentDate > endDate) {
    return { isDue: false, isOverdue: false };
  }
  
  // Check business days
  const businessDays = form.business_days || [1, 2, 3, 4, 5]; // Default to weekdays
  if (!isBusinessDay(currentDate, form.business_days_only, businessDays)) {
    return { isDue: false, isOverdue: false };
  }
  
  // For daily forms, check if it's due today
  if (form.schedule_type === 'daily') {
    // If there's a specific due time, check if we've passed it
    if (form.schedule_time) {
      const [hours, minutes] = form.schedule_time.split(':').map(Number);
      const dueDateTime = new Date(currentDate);
      dueDateTime.setHours(hours, minutes, 0, 0);
      
      // Form is due if current time >= due time on the due date
      const isDue = currentDateTime >= dueDateTime;
      // Form is overdue if current time is past due time
      const isOverdue = currentDateTime > dueDateTime;
      
      return { isDue, isOverdue };
    } else {
      // If no specific time, consider it due all day
      return { isDue: true, isOverdue: false };
    }
  }
  
  // Add other schedule types as needed
  return { isDue: false, isOverdue: false };
}

async function checkForOverdueForms(forms: Form[], currentDateTime: Date) {
  const overdueResults = [];
  
  for (const form of forms) {
    // Check if form is overdue using the current logic that includes time
    const { isOverdue } = isFormDueToday(form, currentDateTime);
    
    if (isOverdue) {
      // Get the date when the form was due
      const currentDate = new Date(currentDateTime);
      currentDate.setHours(0, 0, 0, 0);
      
      const dueDateStart = new Date(currentDate);
      const dueDateEnd = new Date(currentDate);
      dueDateEnd.setDate(dueDateEnd.getDate() + 1);
      
      // Check if there's no response for the due date
      const { data: responses } = await supabase
        .from('form_responses')
        .select('id')
        .eq('form_id', form.id)
        .gte('submitted_at', dueDateStart.toISOString())
        .lt('submitted_at', dueDateEnd.toISOString());
      
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
    
    const currentDateTime = new Date(); // Keep current time for proper due/overdue checking
    
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
        console.log(`Checking form ${form.title} (${form.id}) - schedule_type: ${form.schedule_type}, start_date: ${form.schedule_start_date}, schedule_time: ${form.schedule_time}, business_days_only: ${form.business_days_only}, business_days: ${JSON.stringify(form.business_days)}`);
        
        const { isDue } = isFormDueToday(form, currentDateTime);
        console.log(`Form ${form.title} isDue: ${isDue} at ${currentDateTime.toISOString()}`);
        
        if (isDue) {
          // Check if already completed today
          const currentDate = new Date(currentDateTime);
          currentDate.setHours(0, 0, 0, 0);
          const todayStart = new Date(currentDate);
          const todayEnd = new Date(currentDate);
          todayEnd.setDate(todayEnd.getDate() + 1);
          
          const { data: responses } = await supabase
            .from('form_responses')
            .select('id')
            .eq('form_id', form.id)
            .gte('submitted_at', todayStart.toISOString())
            .lt('submitted_at', todayEnd.toISOString());
          
          if (!responses || responses.length === 0) {
            dueToday.push(form);
          }
        }
      }
      
      // Check for overdue forms
      const overdueToday = await checkForOverdueForms(userFormList, currentDateTime);
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
          url: `https://bce33cae-259d-496a-b77a-618261ca71c2.lovableproject.com/form/${form.short_code}`
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