// src/App.tsx
import React, { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/common/LoadingScreen";
import { onAppResume } from "@/lib/focus-revalidate";
import { useUserRole } from "@/hooks/useUserRole";
import "./App.css";

// Lazy page/component imports (code-splitting)
const Dashboard = lazy(() =>
  import("@/components/dashboard/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const FormExport = lazy(() =>
  import("@/pages/FormExport").then((m) => ({ default: m.FormExport }))
);
const PublicForm = lazy(() =>
  import("@/pages/PublicForm").then((m) => ({ default: m.default }))
);
const Index = lazy(() =>
  import("@/pages/Index").then((m) => ({ default: m.default }))
);
const Pricing = lazy(() =>
  import("@/pages/Pricing").then((m) => ({ default: m.default }))
);
const Success = lazy(() =>
  import("@/pages/Success").then((m) => ({ default: m.default }))
);
const Cancel = lazy(() =>
  import("@/pages/Cancel").then((m) => ({ default: m.default }))
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.default }))
);

// Simple protected-route wrapper
const ProtectedRoute: React.FC<{ isAuthed: boolean; children: React.ReactNode }> = ({
  isAuthed,
  children,
}) => (isAuthed ? <>{children}</> : <Navigate to="/" replace />);

function App() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [navKey, setNavKey] = useState(0); // bump to force remount of <Routes> on resume

  // Read the role out of `subscribers`
  const { role, loading: roleLoading } = useUserRole(session);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
    } catch (e) {
      console.warn("[Auth] getSession threw after resume:", e);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancel) setSession(data.session);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
          if (!cancel) setSession(s);
        });

        return () => sub.subscription.unsubscribe();
      } finally {
        if (!cancel) setChecking(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    // On visibility/focus resume: re-check session and remount routes
    const cleanup = onAppResume(async () => {
      await refreshSession();
      setNavKey((k) => k + 1);
      console.debug("[App] Resume detected: refreshed session + remounted routes");
    });
    return cleanup;
  }, [refreshSession]);

  if (checking || roleLoading) {
    return <LoadingScreen />;
  }

  const isAuthed = Boolean(session);
  const isCreator = role === "form_creator";
  const isFiller = role === "form_filler";

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes key={navKey}>
            {/* Landing page */}
            <Route path="/" element={<Index />} />

            {/* Creator-only routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute isAuthed={isAuthed && isCreator}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export"
              element={
                <ProtectedRoute isAuthed={isAuthed && isCreator}>
                  <FormExport />
                </ProtectedRoute>
              }
            />

            {/* Filler / public routes */}
            <Route path="/public/*" element={<PublicForm />} />

            {/* Shared routes */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
