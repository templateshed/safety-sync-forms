// src/components/dashboard/ProfileSettings.tsx
import React, { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriberRow = {
  user_id: string;
  account_type: "form_creator" | "form_filler" | string | null;
  email?: string | null; // may mirror auth email if you choose later
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const ProfileSettings: React.FC = () => {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubscriberRow | null>(null);
  const [prof, setProf] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        setSub(null);
        setProf(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const [subRes, profRes] = await Promise.all([
        supabase.from("subscribers").select("user_id,account_type").eq("user_id", user.id).single(),
        supabase.from("profiles").select("id,first_name,last_name,job_title,company,created_at,updated_at").eq("id", user.id).single(),
      ]);

      if (cancel) return;

      if (subRes.error) {
        console.warn("[ProfileSettings] subscribers error:", subRes.error);
      }
      if (profRes.error) {
        console.warn("[ProfileSettings] profiles error:", profRes.error);
      }

      if (subRes.error && profRes.error) {
        setError("Failed to load profile information.");
        setSub(null);
        setProf(null);
      } else {
        setError(null);
        setSub((subRes.data as SubscriberRow) ?? null);
        setProf((profRes.data as ProfileRow) ?? null);
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

  const fullName =
    [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() ||
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
          <div className="font-medium">{sub?.account_type ?? "—"}</div>
        </div>

        <div className="text-sm">
          <div className="text-muted-foreground">Company</div>
          <div className="font-medium">{prof?.company ?? "—"}</div>
        </div>

        <div className="text-sm">
          <div className="text-muted-foreground">Job Title</div>
          <div className="font-medium">{prof?.job_title ?? "—"}</div>
        </div>

        <div className="text-sm">
          <div className="text-muted-foreground">User ID</div>
          <div className="font-mono break-all">{user.id}</div>
        </div>
      </CardContent>
    </Card>
  );
};
