// src/components/dashboard/ProfileSettings.tsx
import React, { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UserSelf = {
  user_id: string;
  account_type: "form_creator" | "form_filler" | string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
};

export const ProfileSettings: React.FC = () => {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<UserSelf | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      if (!user) {
        setLoading(false);
        setRow(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("user_self").select("*").single();

      if (cancel) return;

      if (error) {
        console.warn("[ProfileSettings] user_self error:", error);
        setError("Failed to load profile information.");
        setRow(null);
      } else {
        setRow((data as UserSelf) ?? null);
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
          <div className="text-sm text-muted-foreground">No profile found.</div>
        </CardContent>
      </Card>
    );
  }

  const fullName =
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <div className="text-muted-foreground">Name</div>
          <div className="font-medium">{fullName}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Email</div>
          <div className="font-medium">{user.email ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Account Type</div>
          <div className="font-medium">{row.account_type ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Company</div>
          <div className="font-medium">{row.company ?? "—"}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">User ID</div>
          <div className="font-mono break-all">{row.user_id}</div>
        </div>
      </CardContent>
    </Card>
  );
};
