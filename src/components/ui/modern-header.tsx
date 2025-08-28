// src/components/ui/modern-header.tsx
import React, { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type UserSelf = {
  user_id: string;
  account_type: "form_creator" | "form_filler" | string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
};

export const ModernHeader: React.FC = () => {
  const { user, loading } = useAuthUser();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      if (!user) {
        setDisplayName("");
        return;
      }

      const { data, error } = await supabase
        .from("user_self")
        .select("first_name,last_name")
        .single();

      if (cancel) return;

      if (error) {
        console.warn("[ModernHeader] user_self load error:", error);
        // fallback to auth metadata/email
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const fallback =
          (meta["full_name"] as string) ||
          (meta["name"] as string) ||
          user.email ||
          "User";
        setDisplayName(fallback);
      } else {
        const full =
          [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() ||
          user.email ||
          "User";
        setDisplayName(full);
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
