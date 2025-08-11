
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, details?: unknown) =>
  console.log(`[CREATE-CHECKOUT] ${msg}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!stripeKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseAnon);

    // Authenticated user required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or missing email");
    log("User authenticated", { userId: user.id, email: user.email });

    // Allow passing price configuration (optional)
    const body = await req.json().catch(() => ({}));
    const priceId: string | undefined = body?.priceId;
    const amount: number = Number(body?.amount ?? 999); // default $9.99
    const currency: string = (body?.currency ?? "usd").toLowerCase();
    const trialDays: number | undefined = body?.trialDays;

    // Reuse existing customer if present
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined = existingCustomers.data[0]?.id;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/success`;
    const cancelUrl = `${origin}/cancel`;

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency,
            product_data: { name: "Form Creator Pro" },
            unit_amount: amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [lineItem as any],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
    });

    log("Checkout session created", { sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
