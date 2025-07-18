
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/auth/AuthForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { FormExport } from '@/pages/FormExport';
import PublicForm from '@/pages/PublicForm';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public form route - accessible to everyone */}
          <Route path="/form/:formId" element={<PublicForm />} />
          
          {/* Protected routes - require authentication */}
          <Route path="/export/:formId" element={
            !session ? <AuthForm /> : <FormExport />
          } />
          
          {/* Protected dashboard routes */}
          <Route path="*" element={
            !session ? <AuthForm /> : <Dashboard />
          } />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
