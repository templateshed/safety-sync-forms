
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Cancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold">Checkout Canceled</h1>
        <p className="text-muted-foreground">
          No worries. You can resume your purchase anytime.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => navigate("/pricing")} className="brand-gradient text-white">
            Back to Pricing
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
