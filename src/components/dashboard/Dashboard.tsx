
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormList } from './FormList';
import { FormBuilder } from './FormBuilder';
import { FormResponses } from './FormResponses';
import { ProfileSettings } from './ProfileSettings';
import { DashboardOverview } from './DashboardOverview';
import { QRScanner } from './QRScanner';
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
  const [userAccountType, setUserAccountType] = useState<string | null>(null);

  // Set default tab based on account type
  useEffect(() => {
    if (userAccountType === 'form_filler') {
      setActiveTab('qr-scanner');
    } else if (userAccountType === 'form_creator') {
      setActiveTab('overview');
    }
  }, [userAccountType]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchUserAccountType(user.id);
      }
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserAccountType(session.user.id);
      } else {
        setUserAccountType(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserAccountType = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('subscribers')
        .select('account_type')
        .eq('user_id', userId)
        .maybeSingle();
      
      setUserAccountType(data?.account_type || 'form_filler');
    } catch (error) {
      console.error('Error fetching user account type:', error);
      setUserAccountType('form_filler');
    }
  };

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
        user={user}
        userAccountType={userAccountType}
        onSignOut={handleLogout}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <ModernSidebar 
          currentView={activeTab}
          isFormCreator={userAccountType === 'form_creator'}
          onViewChange={(view) => setActiveTab(view)}
          onCreateForm={handleCreateForm}
          onRestrictedView={(view) => setActiveTab(view)}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="hidden">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forms">Forms</TabsTrigger>
                <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
                <TabsTrigger value="responses">Responses</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="qr-scanner">QR Scanner</TabsTrigger>
              </TabsList>

              {/* Form Creator Tabs */}
              {userAccountType === 'form_creator' && (
                <>
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
                </>
              )}

              {/* Form Filler Tabs */}
              {userAccountType === 'form_filler' && (
                <TabsContent value="qr-scanner" className="space-y-6">
                  <QRScanner />
                </TabsContent>
              )}

              {/* Shared Settings Tab */}
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
