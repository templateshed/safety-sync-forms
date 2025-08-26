import React, { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/common/LoadingScreen";
import { onAppResume } from "@/lib/focus-revalidate";
import { useUserRole } from "@/hooks/useUserRole";
import "./App.css";

declare global {
  interface Window {
    __APP_NEEDS_REMOUNT__?: boolean;
  }
}

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
  const [navKey, setNavKey] = useState(0); // bump to remount <Routes> only when needed

  // role from the subscribers table (account_type)
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
    // If we ever *actually* see a chunk error, set the remount flag.
    const onChunkError = () => {
      window.__APP_NEEDS_REMOUNT__ = true;
    };
    window.addEventListener("app:chunk-error", onChunkError);

    // On resume: refresh session. Only remount routes if flagged by a real chunk error.
    const cleanupResume = onAppResume(async () => {
      await refreshSession();
      if (window.__APP_NEEDS_REMOUNT__) {
        setNavKey((k) => k + 1);
        window.__APP_NEEDS_REMOUNT__ = false;
        console.debug("[App] Resume: remounted routes due to prior chunk error.");
      } else {
        // No remount → we keep component state (e.g., form builder state & active tab)
        console.debug("[App] Resume: no remount (state preserved).");
      }
    });

    return () => {
      window.removeEventListener("app:chunk-error", onChunkError);
      cleanupResume();
    };
  }, [refreshSession]);

  if (checking || roleLoading) {
    return <LoadingScreen />;
  }

  const isAuthed = Boolean(session);
  const isCreator = role === "form_creator";

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes key={navKey}>
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

            {/* Filler/Public */}
            <Route path="/public/*" element={<PublicForm />} />

            {/* Shared */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
