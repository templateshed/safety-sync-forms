import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Users, Calendar, Settings, LogOut } from 'lucide-react';
import { FormBuilder } from './FormBuilder';
import { FormList } from './FormList';
import { FormResponses } from './FormResponses';
import { toast } from '@/hooks/use-toast';

type View = 'forms' | 'builder' | 'responses' | 'analytics' | 'settings';

export const Dashboard = () => {
  const [currentView, setCurrentView] = useState<View>('forms');
  const [user, setUser] = useState<any>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateForm = () => {
    setSelectedFormId(null);
    setCurrentView('builder');
  };

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentView('builder');
  };

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
              My Forms
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleCreateForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
            <Button
              variant={currentView === 'responses' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('responses')}
            >
              <Users className="h-4 w-4 mr-2" />
              Responses
            </Button>
            <Button
              variant={currentView === 'analytics' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('analytics')}
            >
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {currentView === 'forms' && (
            <FormList onEditForm={handleEditForm} onCreateForm={handleCreateForm} />
          )}
          {currentView === 'builder' && (
            <FormBuilder 
              formId={selectedFormId} 
              onSave={() => setCurrentView('forms')}
            />
          )}
          {currentView === 'responses' && (
            <FormResponses />
          )}
          {currentView === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Analytics</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">Analytics dashboard coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
          {currentView === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">Settings panel coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
