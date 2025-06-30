
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Users, Calendar, Settings, LogOut, Lock } from 'lucide-react';
import { FormBuilder } from './FormBuilder';
import { FormList } from './FormList';
import { FormResponses } from './FormResponses';
import { Analytics } from './Analytics';
import { toast } from '@/hooks/use-toast';

type View = 'forms' | 'builder' | 'responses' | 'analytics' | 'settings';

export const Dashboard = () => {
  const [currentView, setCurrentView] = useState<View>('forms');
  const [user, setUser] = useState<any>(null);
  const [userAccountType, setUserAccountType] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user account type from subscribers table
        const { data: subscriber, error } = await supabase
          .from('subscribers')
          .select('account_type')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user account type:', error);
        } else {
          setUserAccountType(subscriber?.account_type || 'form_filler');
        }
      }
      setLoading(false);
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateForm = () => {
    if (userAccountType !== 'form_creator') {
      toast({
        title: "Upgrade Required",
        description: "You need a Form Creator account to create forms. Please upgrade your account.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFormId(null);
    setCurrentView('builder');
  };

  const handleEditForm = (formId: string) => {
    if (userAccountType !== 'form_creator') {
      toast({
        title: "Upgrade Required",
        description: "You need a Form Creator account to edit forms. Please upgrade your account.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFormId(formId);
    setCurrentView('builder');
  };

  const handleRestrictedView = (view: View) => {
    if (userAccountType !== 'form_creator') {
      toast({
        title: "Upgrade Required",
        description: "This feature is only available for Form Creator accounts. Please upgrade your account.",
        variant: "destructive",
      });
      return;
    }
    setCurrentView(view);
  };

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

  const isFormCreator = userAccountType === 'form_creator';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">FormBuilder Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={isFormCreator ? "default" : "secondary"}>
                {isFormCreator ? "Form Creator" : "Form Filler"}
              </Badge>
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <Button
              variant={currentView === 'forms' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('forms')}
            >
              <FileText className="h-4 w-4 mr-2" />
              {isFormCreator ? 'My Forms' : 'Available Forms'}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleCreateForm}
              disabled={!isFormCreator}
            >
              {!isFormCreator && <Lock className="h-4 w-4 mr-2" />}
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
            
            <Button
              variant={currentView === 'responses' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => isFormCreator ? setCurrentView('responses') : handleRestrictedView('responses')}
              disabled={!isFormCreator}
            >
              {!isFormCreator && <Lock className="h-4 w-4 mr-2" />}
              <Users className="h-4 w-4 mr-2" />
              Responses
            </Button>
            
            <Button
              variant={currentView === 'analytics' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => isFormCreator ? setCurrentView('analytics') : handleRestrictedView('analytics')}
              disabled={!isFormCreator}
            >
              {!isFormCreator && <Lock className="h-4 w-4 mr-2" />}
              <Calendar className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            
            <Button
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            {!isFormCreator && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Upgrade to Form Creator</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Create unlimited forms, access analytics, and manage responses.
                </p>
                <Button size="sm" className="w-full">
                  Upgrade Account
                </Button>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {currentView === 'forms' && (
            <FormList onEditForm={handleEditForm} onCreateForm={handleCreateForm} />
          )}
          {currentView === 'builder' && isFormCreator && (
            <FormBuilder 
              formId={selectedFormId} 
              onSave={() => setCurrentView('forms')}
            />
          )}
          {currentView === 'responses' && isFormCreator && (
            <FormResponses />
          )}
          {currentView === 'analytics' && isFormCreator && (
            <Analytics />
          )}
          {currentView === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details and subscription status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Type</label>
                    <p className="text-gray-900">{isFormCreator ? 'Form Creator (Paid)' : 'Form Filler (Free)'}</p>
                  </div>
                  {!isFormCreator && (
                    <div className="pt-4 border-t">
                      <Button>
                        Upgrade to Form Creator
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        Get access to form creation, analytics, and advanced features.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
