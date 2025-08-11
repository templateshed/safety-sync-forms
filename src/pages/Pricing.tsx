
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Check, Shield, Star } from "lucide-react";

export default function Pricing() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      // You can pass priceId if you already have a Stripe Price ID:
      // const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId: 'price_123' } });
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          // Defaults to $9.99/mo if not provided
          // amount: 999,
          // currency: 'usd',
          // trialDays: 0,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 brand-gradient rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float delay-1000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 brand-gradient rounded-2xl shadow-lg mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text">Upgrade to Form Creator Pro</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Unlock full form creation, analytics, branding, and priority support.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Access and fill published forms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">Free</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access forms via link/QR</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Mobile-friendly scanning</li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Pro <Star className="h-4 w-4 text-yellow-500" />
                  </CardTitle>
                  <CardDescription>For creators who build and manage forms</CardDescription>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="text-4xl font-bold">$9.99</div>
                <div className="text-muted-foreground mb-1">/month</div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited custom forms</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced analytics</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Custom branding & themes</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>

              {!isAuthed ? (
                <Button
                  onClick={() => navigate("/dashboard")}
                  size="lg"
                  className="w-full brand-gradient text-white hover:shadow-lg hover:scale-105"
                >
                  Sign in to Subscribe
                </Button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={handleSubscribe}
                    size="lg"
                    disabled={busy}
                    className="w-full brand-gradient text-white hover:shadow-lg hover:scale-105"
                  >
                    {busy ? "Starting..." : "Subscribe Now"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleManage}
                    disabled={busy}
                    size="lg"
                    className="w-full"
                  >
                    Manage Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
