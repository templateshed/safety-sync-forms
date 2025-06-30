import React, { useState, useEffect } from 'react';
import { FileText, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
interface ModernHeaderProps {
  user?: {
    email?: string;
    id?: string;
  };
  userAccountType?: string | null;
  onSignOut: () => void;
}
export const ModernHeader = ({
  user,
  userAccountType,
  onSignOut
}: ModernHeaderProps) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const isFormCreator = userAccountType === 'form_creator';
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id]);
  const fetchUserProfile = async () => {
    try {
      const {
        data
      } = await supabase.from('profiles').select('first_name, last_name, job_title').eq('id', user?.id).maybeSingle();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    } else if (userProfile?.first_name) {
      return userProfile.first_name;
    } else if (userProfile?.last_name) {
      return userProfile.last_name;
    }
    return user?.email || 'User';
  };
  const getSubtitle = () => {
    if (userProfile?.job_title) {
      return userProfile.job_title;
    }
    return user?.email || '';
  };
  return <header className="relative bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="absolute inset-0 brand-gradient opacity-5"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 brand-gradient rounded-lg blur-sm opacity-30"></div>
              <div className="relative bg-card p-2 rounded-lg brand-shadow">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Ascendrix Forms</h1>
              <p className="text-xs text-muted-foreground">Create • Analyze • Succeed</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={isFormCreator ? "default" : "secondary"} className={`${isFormCreator ? 'brand-gradient text-white border-0' : ''} font-medium px-3 py-1`}>
              {isFormCreator && <Sparkles className="h-3 w-3 mr-1" />}
              {isFormCreator ? "Form Creator" : "Form Filler"}
            </Badge>
            
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">Welcome back, {getDisplayName()}!</p>
              <p className="text-xs text-muted-foreground">{getSubtitle()}</p>
            </div>
            
            <Button variant="outline" size="sm" onClick={onSignOut} className="bg-card/50 hover:bg-card/80 border-border transition-all duration-200">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>;
};