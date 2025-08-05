
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 loading-spinner mx-auto"></div>
            <div className="absolute inset-0 w-12 h-12 loading-spinner mx-auto animate-ping opacity-20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-foreground font-medium">Loading Application</p>
            <p className="text-muted-foreground text-sm">Preparing your workspace...</p>
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
