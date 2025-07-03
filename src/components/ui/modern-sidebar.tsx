
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Users, Calendar, Settings, Lock, Zap, BarChart3, QrCode } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type View = 'overview' | 'forms' | 'form-builder' | 'responses' | 'settings' | 'qr-scanner';

interface ModernSidebarProps {
  currentView: string;
  isFormCreator: boolean;
  onViewChange: (view: View) => void;
  onCreateForm: () => void;
  onRestrictedView: (view: View) => void;
}

export const ModernSidebar = ({ 
  currentView, 
  isFormCreator, 
  onViewChange, 
  onCreateForm, 
  onRestrictedView 
}: ModernSidebarProps) => {
  const isMobile = useIsMobile();
  
  // Different navigation items based on user type
  const formCreatorItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: BarChart3,
      onClick: () => onViewChange('overview'),
      restricted: false,
    },
    {
      id: 'forms' as const,
      label: 'My Forms',
      icon: FileText,
      onClick: () => onViewChange('forms'),
      restricted: false,
    },
    {
      id: 'responses' as const,
      label: 'Responses',
      icon: Users,
      onClick: () => onViewChange('responses'),
      restricted: false,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      onClick: () => onViewChange('settings'),
      restricted: false,
    },
  ];

  const formFillerItems = [
    {
      id: 'qr-scanner' as const,
      label: 'Scan Form QR',
      icon: QrCode,
      onClick: () => onViewChange('qr-scanner'),
      restricted: false,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      onClick: () => onViewChange('settings'),
      restricted: false,
    },
  ];

  const navigationItems = isFormCreator ? formCreatorItems : formFillerItems;

  return (
    <aside className={`${isMobile ? 'w-16' : 'w-64'} bg-card/60 backdrop-blur-sm shadow-sm h-[calc(100vh-4rem)] border-r border-border transition-all duration-300`}>
      <nav className={`${isMobile ? 'p-2' : 'p-6'} space-y-3`}>
        {/* Create Form Button */}
        <Button
          onClick={onCreateForm}
          disabled={!isFormCreator}
          className={`w-full ${isMobile ? 'justify-center px-0' : 'justify-start'} mb-6 h-12 text-left font-medium transition-all duration-200 ${
            isFormCreator 
              ? 'brand-gradient hover:shadow-lg hover:scale-105 text-white border-0' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          title={isMobile ? "Create Form" : undefined}
        >
          {!isFormCreator && <Lock className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />}
          <Plus className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
          {!isMobile && 'Create Form'}
        </Button>

        {/* Navigation Items */}
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'default' : 'ghost'}
            className={`w-full ${isMobile ? 'justify-center px-0' : 'justify-start'} h-11 font-medium transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15' 
                : 'hover:bg-muted/80'
            } ${item.restricted ? 'text-muted-foreground' : ''}`}
            onClick={item.onClick}
            disabled={item.restricted}
            title={isMobile ? item.label : undefined}
          >
            {item.restricted && <Lock className={`h-4 w-4 ${isMobile ? '' : 'mr-2'} opacity-50`} />}
            <item.icon className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
            {!isMobile && item.label}
          </Button>
        ))}

        {/* Upgrade Prompt for Form Fillers */}
        {!isFormCreator && !isMobile && (
          <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center mb-2">
              <Zap className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-semibold text-foreground">Upgrade to Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Unlock unlimited forms, advanced analytics, and premium features.
            </p>
            <Button 
              size="sm" 
              className="w-full brand-gradient text-white border-0 hover:shadow-md transition-all duration-200"
              onClick={() => onViewChange('settings')}
            >
              Upgrade Now
            </Button>
          </div>
        )}
        
        {/* Mobile Upgrade Icon for Form Fillers */}
        {!isFormCreator && isMobile && (
          <Button
            variant="ghost"
            className="w-full justify-center h-11 text-primary"
            onClick={() => onViewChange('settings')}
            title="Upgrade to Pro"
          >
            <Zap className="h-4 w-4" />
          </Button>
        )}
      </nav>
    </aside>
  );
};
