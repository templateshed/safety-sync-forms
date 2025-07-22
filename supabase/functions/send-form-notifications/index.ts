import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  email: string;
  name: string;
  subject: string;
  forms: Array<{
    title: string;
    dueType: 'due' | 'overdue';
    shortCode: string;
    url: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subject, forms }: EmailNotificationRequest = await req.json();

    console.log(`Sending notification to ${email} for ${forms.length} forms`);

    const formsList = forms.map(form => 
      `<li style="margin: 10px 0; padding: 15px; background: ${form.dueType === 'overdue' ? '#fef2f2' : '#f0f9ff'}; border-left: 4px solid ${form.dueType === 'overdue' ? '#ef4444' : '#3b82f6'}; border-radius: 4px;">
        <strong style="color: ${form.dueType === 'overdue' ? '#dc2626' : '#1d4ed8'};">${form.title}</strong> (${form.shortCode})
        <br>
        <span style="color: ${form.dueType === 'overdue' ? '#dc2626' : '#1d4ed8'}; font-weight: 600;">
          ${form.dueType === 'overdue' ? '⚠️ OVERDUE' : '📅 Due Today'}
        </span>
        <br>
        <a href="${form.url}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">View Form →</a>
      </li>`
    ).join('');

    const emailResponse = await resend.emails.send({
      from: "Form Manager <forms@ascendrix.co.uk>",
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 30px;">Form Status Notification</h1>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 25px;">
            Hello ${name || 'there'},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 25px;">
            You have ${forms.length} form${forms.length > 1 ? 's' : ''} that require${forms.length === 1 ? 's' : ''} your attention:
          </p>
          
          <ul style="list-style: none; padding: 0; margin: 25px 0;">
            ${formsList}
          </ul>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from your Form Manager system.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-form-notifications function:", error);
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