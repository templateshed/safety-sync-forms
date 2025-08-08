
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/auth/AuthForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { FormExport } from '@/pages/FormExport';
import PublicForm from '@/pages/PublicForm';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/contexts/ThemeContext';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async (reason: string) => {
      try {
        console.debug('[Auth] Checking session:', reason);
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(session);
          setLoading(false);
        }
      } catch (e) {
        console.error('[Auth] getSession error', e);
        if (!cancelled) setLoading(false);
      }
    };

    // Initial session check
    checkSession('initial');

    // Safety timeout to avoid indefinite spinner on throttled tabs
    const safety = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] Safety timeout reached; unlocking UI');
        setLoading(false);
      }
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.debug('[Auth] onAuthStateChange:', _event);
      setSession(session);
      setLoading(false);
    });

    // Refresh session on focus/visibility/page show (handles background tab throttling)
    const onFocus = () => checkSession('window_focus');
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession('tab_visible');
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if ((e as any).persisted) {
        checkSession('pageshow_bfcache');
      } else {
        checkSession('pageshow');
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      clearTimeout(safety);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 loading-spinner mx-auto"></div>
            <div className="absolute inset-0 w-12 h-12 loading-spinner mx-auto animate-ping opacity-20"></div>
          </div>
          <div className="space-y-3">
            <p className="text-foreground font-medium">Loading Application</p>
            <p className="text-muted-foreground text-sm">Preparing your workspace...</p>
            <button
              onClick={() => {
                setLoading(true);
                supabase.auth.getSession().then(({ data: { session } }) => {
                  setSession(session);
                  setLoading(false);
                });
              }}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 transition"
              aria-label="Retry loading"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes - accessible to everyone */}
          <Route path="/form/:formId" element={<PublicForm />} />
          <Route path="/" element={<Index />} />
          
          {/* Protected routes - require authentication */}
          <Route path="/export/:formId" element={
            !session ? <AuthForm /> : <FormExport />
          } />
          
          {/* Dashboard routes - require authentication */}
          <Route path="/dashboard/*" element={
            !session ? <AuthForm /> : <Dashboard />
          } />
          
          {/* Catch-all for unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
