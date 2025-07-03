
import React, { useState } from 'react';
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

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'forms', label: 'Forms', icon: FileText },
    { id: 'create', label: 'Create Form', icon: PlusCircle },
    { id: 'responses', label: 'Responses', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === 'create') {
      handleCreateForm();
    } else {
      setActiveTab(itemId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ModernHeader onLogout={handleLogout} />
      
      <div className="flex">
        <ModernSidebar 
          items={sidebarItems}
          activeItem={activeTab}
          onItemClick={handleSidebarItemClick}
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
                <DashboardOverview onCreateForm={handleCreateForm} />
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
                  onBack={handleBackToForms}
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
                <ProfileSettings />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};
