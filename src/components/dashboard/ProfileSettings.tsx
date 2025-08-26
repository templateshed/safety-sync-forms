// src/components/dashboard/ProfileSettings.tsx
import React, { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriberRow = {
  user_id: string;
  account_type: "form_creator" | "form_filler" | string | null;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

export const ProfileSettings: React.FC = () => {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<SubscriberRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        setRow(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("subscribers")
        .select("user_id, account_type, name, full_name, display_name, email, created_at")
        .eq("user_id", user.id)
        .single();

      if (cancel) return;

      if (error) {
        console.warn("[ProfileSettings] load error:", error);
        setError("Failed to load profile information.");
        setRow(null);
      } else {
        setRow((data as SubscriberRow) ?? null);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  if (authLoading) {
    return <div className="text-sm text-muted-foreground">Checking sign-in…</div>;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">You need to sign in to view your profile.</div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!row) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No profile record found.</div>
        </CardContent>
      </Card>
    );
  }

  const name = row.display_name || row.full_name || row.name || user.user_metadata?.name || user.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <div className="text-muted-foreground">Name</div>
          <div className="font-medium">{name ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Email</div>
          <div className="font-medium">{row.email ?? user.email ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Account Type</div>
          <div className="font-medium">{row.account_type ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">User ID</div>
          <div className="font-mono break-all">{row.user_id}</div>
        </div>
        {row.created_at ? (
          <div className="text-sm">
            <div className="text-muted-foreground">Created</div>
            <div className="font-medium">{new Date(row.created_at).toLocaleString()}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
