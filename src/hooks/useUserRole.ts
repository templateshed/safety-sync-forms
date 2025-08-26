// src/hooks/useUserRole.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the current user's role from the `subscribers` table.
 * Expected columns:
 *  - user_id (uuid) -> references auth.users.id
 *  - account_type (text) -> 'form_creator' | 'form_filler'
 */
export type AccountType = "form_creator" | "form_filler" | null;

export function useUserRole(session: any) {
  const [role, setRole] = useState<AccountType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    async function fetchRole() {
      if (!session?.user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // If your PK is 'id' (same as auth uid), switch eq('id', session.user.id).
      const { data, error } = await supabase
        .from("subscribers")
        .select("account_type")
        .eq("user_id", session.user.id)
        .single();

      if (!cancel) {
        if (error) {
          console.warn("[useUserRole] error:", error);
          setRole(null);
        } else {
          const value = (data?.account_type ?? null) as AccountType;
          setRole(value);
        }
        setLoading(false);
      }
    }

    fetchRole();
    return () => {
      cancel = true;
    };
  }, [session]);

  return { role, loading };
}
