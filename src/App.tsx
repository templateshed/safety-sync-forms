import React, { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/common/LoadingScreen";
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

// Optional: simple protected-route wrapper
const ProtectedRoute: React.FC<{ isAuthed: boolean; children: React.ReactNode }> = ({
  isAuthed,
  children,
}) => (isAuthed ? <>{children}</> : <Navigate to="/" replace />);

function App() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancel = false;

    const run = async () => {
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
    };

    const cleanup = run();
    return () => {
      cancel = true;
      // cleanup might be a promise; ignore here
    };
  }, []);

  if (checking) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute isAuthed={Boolean(session)}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export"
              element={
                <ProtectedRoute isAuthed={Boolean(session)}>
                  <FormExport />
                </ProtectedRoute>
              }
            />
            {/* Public forms — wildcard covers nested routes used by your PublicForm page */}
            <Route path="/public/*" element={<PublicForm />} />

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
