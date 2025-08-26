// src/components/ui/modern-header.tsx
import React, { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SubscriberRow = {
  user_id: string;
  account_type: "form_creator" | "form_filler" | string | null;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
};

export const ModernHeader: React.FC = () => {
  const { user, loading } = useAuthUser();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      if (!user?.id) {
        setDisplayName("");
        return;
      }
      const { data, error } = await supabase
        .from("subscribers")
        .select("account_type, name, full_name, display_name")
        .eq("user_id", user.id)
        .single();

      if (cancel) return;

      if (error) {
        console.warn("[ModernHeader] failed to load subscriber name:", error);
        setDisplayName(user.email ?? "User");
      } else {
        const row = data as SubscriberRow | null;
        const name =
          row?.display_name ||
          row?.full_name ||
          row?.name ||
          user.user_metadata?.name ||
          user.email ||
          "User";
        setDisplayName(name);
      }
    };

    load();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      <div className="font-semibold">Safety Sync Forms</div>
      <div className="flex items-center gap-3">
        {!loading && user ? (
          <div className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{displayName}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {user ? (
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>
    </header>
  );
};
