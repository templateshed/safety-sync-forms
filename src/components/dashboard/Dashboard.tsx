
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormBuilder } from './FormBuilder';
import { FormList } from './FormList';
import { FormResponses } from './FormResponses';
import { Analytics } from './Analytics';
import { AccountUpgrade } from './AccountUpgrade';
import { ProfileSettings } from './ProfileSettings';
import { ModernHeader } from '@/components/ui/modern-header';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

type View = 'forms' | 'builder' | 'responses' | 'analytics' | 'settings';

export const Dashboard = () => {
  const [currentView, setCurrentView] = useState<View>('forms');
  const [user, setUser] = useState<any>(null);
  const [userAccountType, setUserAccountType] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserAccountType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await fetchUserAccountType();
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

  const handleUpgradeSuccess = async () => {
    // Refresh the user account type after successful upgrade
    await fetchUserAccountType();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 brand-gradient rounded-2xl mx-auto mb-4 animate-pulse"></div>
          <div className="w-32 h-4 bg-muted rounded mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isFormCreator = userAccountType === 'form_creator';

  return (
    <div className="min-h-screen bg-background">
      <ModernHeader 
        user={user}
        userAccountType={userAccountType}
        onSignOut={handleSignOut}
      />

      <div className="flex">
        <ModernSidebar
          currentView={currentView}
          isFormCreator={isFormCreator}
          onViewChange={setCurrentView}
          onCreateForm={handleCreateForm}
          onRestrictedView={handleRestrictedView}
        />

        {/* Main Content */}
        <main className="flex-1 p-8 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            {currentView === 'forms' && (
              <div className="animate-slide-up">
                <FormList onEditForm={handleEditForm} onCreateForm={handleCreateForm} />
              </div>
            )}
            {currentView === 'builder' && isFormCreator && (
              <div className="animate-scale-in">
                <FormBuilder 
                  formId={selectedFormId} 
                  onSave={() => setCurrentView('forms')}
                />
              </div>
            )}
            {currentView === 'responses' && isFormCreator && (
              <div className="animate-slide-up">
                <FormResponses />
              </div>
            )}
            {currentView === 'analytics' && isFormCreator && (
              <div className="animate-slide-up">
                <Analytics />
              </div>
            )}
            {currentView === 'settings' && (
              <div className="space-y-6 animate-slide-up">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-foreground mb-2">Settings</h2>
                  <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>
                
                {/* Profile Settings Section */}
                <div className="animate-scale-in">
                  <ProfileSettings user={user} />
                </div>
                
                {/* Account Upgrade Section */}
                <div className="animate-scale-in">
                  <AccountUpgrade 
                    userAccountType={userAccountType}
                    onUpgradeSuccess={handleUpgradeSuccess}
                  />
                </div>
                
                {/* Account Information Section */}
                <Card className="glass-effect animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">Account Information</CardTitle>
                    <CardDescription>Your account details and subscription status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
                        <p className="text-foreground font-medium">{user?.email}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Account Type</label>
                        <div className="flex items-center space-x-2">
                          <p className="text-foreground font-medium">
                            {isFormCreator ? 'Form Creator' : 'Form Filler'}
                          </p>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            isFormCreator 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {isFormCreator ? 'Pro' : 'Free'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
