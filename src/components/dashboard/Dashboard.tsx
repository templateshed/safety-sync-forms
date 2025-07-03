
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormList } from './FormList';
import { FormBuilder } from './FormBuilder';
import { FormResponses } from './FormResponses';
import { Analytics } from './Analytics';
import { ComplianceReporting } from './ComplianceReporting';
import { ProfileSettings } from './ProfileSettings';
import { DashboardOverview } from './DashboardOverview';
import { ModernHeader } from '@/components/ui/modern-header';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  MessageSquare, 
  BarChart3, 
  Shield,
  Settings,
  LogOut
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateForm = () => {
    setEditingFormId('new');
    setActiveTab('form-builder');
  };

  const handleEditForm = (formId: string) => {
    setEditingFormId(formId);
    setActiveTab('form-builder');
  };

  const handleFormSaved = () => {
    setEditingFormId(null);
    setActiveTab('forms');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBackToForms = () => {
    setEditingFormId(null);
    setActiveTab('forms');
  };

  return (
    <div className="min-h-screen bg-background">
      <ModernHeader 
        onSignOut={handleLogout}
      />
      
      <div className="flex">
        <ModernSidebar 
          currentView={activeTab}
          isFormCreator={true}
          onViewChange={(view) => setActiveTab(view)}
          onCreateForm={handleCreateForm}
          onRestrictedView={(view) => setActiveTab(view)}
        />
        
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="hidden">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forms">Forms</TabsTrigger>
                <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
                <TabsTrigger value="responses">Responses</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <DashboardOverview />
              </TabsContent>

              <TabsContent value="forms" className="space-y-6">
                <FormList 
                  onEditForm={handleEditForm}
                  onCreateForm={handleCreateForm}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>

              <TabsContent value="form-builder" className="space-y-6">
                <FormBuilder 
                  formId={editingFormId}
                  onSave={handleFormSaved}
                />
              </TabsContent>

              <TabsContent value="responses" className="space-y-6">
                <FormResponses />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <Analytics />
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6">
                <ComplianceReporting />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <ProfileSettings user={user} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};
