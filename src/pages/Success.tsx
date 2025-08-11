
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    // Refresh subscription status after returning from Stripe
    supabase.functions.invoke("check-subscription").finally(() => {
      // no-op; DB updated for the user
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold">Subscription Activated</h1>
        <p className="text-muted-foreground">
          Thanks for upgrading! Your account will reflect your new plan shortly.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => navigate("/dashboard")} className="brand-gradient text-white">
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
