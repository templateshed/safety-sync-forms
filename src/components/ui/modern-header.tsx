
import React from 'react';
import { FileText, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ModernHeaderProps {
  user?: { email?: string };
  userAccountType?: string | null;
  onSignOut: () => void;
}

export const ModernHeader = ({ user, userAccountType, onSignOut }: ModernHeaderProps) => {
  const isFormCreator = userAccountType === 'form_creator';

  return (
    <header className="relative bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
      <div className="absolute inset-0 brand-gradient opacity-5"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 brand-gradient rounded-lg blur-sm opacity-30"></div>
              <div className="relative bg-white p-2 rounded-lg brand-shadow">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                FormBuilder Pro
              </h1>
              <p className="text-xs text-muted-foreground">Create • Analyze • Succeed</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge 
              variant={isFormCreator ? "default" : "secondary"}
              className={`${isFormCreator ? 'brand-gradient text-white border-0' : ''} font-medium px-3 py-1`}
            >
              {isFormCreator && <Sparkles className="h-3 w-3 mr-1" />}
              {isFormCreator ? "Form Creator" : "Form Filler"}
            </Badge>
            
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">Welcome back!</p>
              <p className="text-xs text-gray-600">{user?.email}</p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSignOut}
              className="bg-white/50 hover:bg-white/80 border-gray-200 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
