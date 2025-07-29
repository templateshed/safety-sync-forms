import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client for authentication verification
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

// Security headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://jjwfyiaddsznftszmxhc.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

// Rate limiting - simple in-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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

// Security helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function sanitizeString(str: string): string {
  return str.replace(/[<>'"]/g, '').trim().substring(0, 1000);
}

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIp);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  clientData.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  
  // Apply rate limiting
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Verify authentication from internal service
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Parse and validate request body
    const body = await req.text();
    if (!body || body.length > 10000) { // 10KB limit
      throw new Error("Invalid request body size");
    }

    const requestData = JSON.parse(body);
    const { email, name, subject, forms }: EmailNotificationRequest = requestData;

    // Input validation
    if (!email || !isValidEmail(email)) {
      throw new Error("Invalid email address");
    }

    if (!subject || subject.length > 200) {
      throw new Error("Invalid subject");
    }

    if (!Array.isArray(forms) || forms.length === 0 || forms.length > 50) {
      throw new Error("Invalid forms array");
    }

    // Validate and sanitize each form in the array
    const sanitizedForms = forms.map(form => {
      if (!form.title || !form.shortCode || !form.url || !form.dueType) {
        throw new Error("Invalid form data structure");
      }
      
      // Validate URL format
      try {
        new URL(form.url);
      } catch {
        throw new Error("Invalid form URL");
      }
      
      return {
        title: sanitizeString(form.title),
        shortCode: sanitizeString(form.shortCode),
        url: form.url, // URLs are validated above
        dueType: form.dueType === 'overdue' ? 'overdue' : 'due'
      };
    });

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email);
    const sanitizedName = sanitizeString(name || "User");
    const sanitizedSubject = sanitizeString(subject);

    console.log(`Sending notification to ${sanitizedEmail} for ${sanitizedForms.length} forms`);

    const formsList = sanitizedForms.map(form => 
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
      from: "Ascendrix Form Manager <forms@ascendrix.co.uk>",
      to: [sanitizedEmail],
      subject: sanitizedSubject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 30px;">Form Status Notification</h1>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 25px;">
            Hello ${sanitizedName},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 25px;">
            You have ${sanitizedForms.length} form${sanitizedForms.length > 1 ? 's' : ''} that require${sanitizedForms.length === 1 ? 's' : ''} your attention:
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