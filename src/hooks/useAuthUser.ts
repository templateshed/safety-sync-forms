// src/hooks/useAuthUser.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current Supabase auth user (or null), plus a loading flag.
 * Subscribes to auth changes so consumers stay in sync.
 */
export function useAuthUser() {
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!cancel) {
          if (error) {
            console.warn("[useAuthUser] getUser error:", error);
            setUser(null);
          } else {
            setUser(data.user ?? null);
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
      cancel = true;
    };
  }, []);

  return { user, loading };
}
