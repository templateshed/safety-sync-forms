import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get the current user's role from the `profiles` table.
 * Adjust the table/column names if yours differ.
 */
export function useUserRole(session: any) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    const fetchRole = async () => {
      if (!session?.user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles") // 👈 adjust if your table is named differently
        .select("account_type") // 👈 adjust if your column is named differently
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.warn("[useUserRole] error fetching role:", error);
        if (!cancel) setRole(null);
      } else {
        if (!cancel) setRole(data?.account_type ?? null);
      }
      if (!cancel) setLoading(false);
    };

    fetchRole();

    return () => {
      cancel = true;
    };
  }, [session]);

  return { role, loading };
}
